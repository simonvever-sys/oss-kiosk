const STORAGE_KEYS = {
  sales: "oss-kiosk-sales",
  theme: "oss-kiosk-theme",
  products: "oss-kiosk-products",
  cart: "oss-kiosk-cart",
};

const PRODUCT_ADMIN_PIN = "0905";

const DEFAULT_PRODUCTS = [
  {
    id: "sun-lolly",
    name: "Sun Lolly",
    price: 5,
    stock: null,
    color: "#2563eb",
    offers: [
      { qty: 3, price: 12, label: "3 for 12" },
      { qty: 5, price: 15, label: "5 for 15" },
    ],
  },
  {
    id: "slikpinde",
    name: "Slikpinde",
    price: 2,
    stock: null,
    color: "#db2777",
    offers: [
      { qty: 3, price: 5, label: "3 for 5" },
      { qty: 10, price: 10, label: "10 for 10" },
    ],
  },
  {
    id: "popcorn",
    name: "Popcorn",
    price: 10,
    stock: null,
    color: "#ea580c",
    offers: [
      { qty: 2, price: 15, label: "2 for 15" },
      { qty: 3, price: 15, label: "3 for 15" },
    ],
  },
  {
    id: "slush-ice",
    name: "Slush ice",
    price: 8,
    stock: null,
    color: "#0ea5e9",
    offers: [{ qty: 3, price: 20, label: "3 for 20" }],
  },
  {
    id: "sodavand",
    name: "Sodavand",
    price: 12,
    stock: null,
    color: "#059669",
    offers: [{ qty: 3, price: 30, label: "3 for 30" }],
  },
  {
    id: "is",
    name: "Is",
    price: 15,
    stock: null,
    color: "#7c3aed",
    offers: [],
  },
  {
    id: "slikpose",
    name: "Slikpose",
    price: 10,
    stock: null,
    color: "#be123c",
    offers: [{ qty: 3, price: 25, label: "3 for 25" }],
  },
  {
    id: "kaffe",
    name: "Kaffe",
    price: 8,
    stock: null,
    color: "#7c2d12",
    offers: [],
  },
  {
    id: "toast",
    name: "Toast",
    price: 20,
    stock: null,
    color: "#334155",
    offers: [{ qty: 2, price: 35, label: "2 for 35" }],
  },
  {
    id: "vand",
    name: "Vand",
    price: 10,
    stock: null,
    color: "#0284c7",
    offers: [{ qty: 3, price: 25, label: "3 for 25" }],
  },
];

const state = {
  products: [],
  cart: {},
  sales: [],
};

const productGrid = document.getElementById("product-grid");
const cartBody = document.getElementById("cart-body");
const grandTotal = document.getElementById("grand-total");
const totalSavings = document.getElementById("total-savings");
const totalSavingsRow = document.getElementById("total-savings-row");
const checkoutBtn = document.getElementById("checkout-btn");
const repCheckoutBtn = document.getElementById("rep-checkout-btn");
const checkoutMsg = document.getElementById("checkout-msg");
const themeToggle = document.getElementById("theme-toggle");
const productAdminList = document.getElementById("product-admin-list");
const productAdminDrawer = document.getElementById("product-admin-drawer");
const salesCount = document.getElementById("sales-count");
const salesTotal = document.getElementById("sales-total");
const repTotal = document.getElementById("rep-total");
const itemsTotal = document.getElementById("items-total");
const salesList = document.getElementById("sales-list");
const exportSalesBtn = document.getElementById("export-sales-btn");
const clearSalesBtn = document.getElementById("clear-sales-btn");
const newProductNameInput = document.getElementById("new-product-name");
const newProductStockInput = document.getElementById("new-product-stock");
const newProductPriceInput = document.getElementById("new-product-price");
const newProductOffersInput = document.getElementById("new-product-offers");
const addProductBtn = document.getElementById("add-product-btn");
const productAdminMsg = document.getElementById("product-admin-msg");
let isProductAdminUnlocked = false;

function formatDKK(value) {
  return `${value.toFixed(2).replace(".", ",")} kr`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function offersToText(offers) {
  if (!Array.isArray(offers) || !offers.length) {
    return "";
  }
  return offers.map((offer) => `${offer.qty}=${offer.price}`).join(",");
}

function parseOffersText(input) {
  const raw = String(input || "").trim();
  if (!raw) {
    return { ok: true, offers: [] };
  }

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const offers = [];
  for (const part of parts) {
    const match = part.match(/^(\d+)\s*=\s*(\d+(?:[.,]\d+)?)$/);
    if (!match) {
      return { ok: false, error: `Ugyldigt rabatformat: "${part}"` };
    }
    const qty = Number(match[1]);
    const price = Number(match[2].replace(",", "."));
    if (!qty || Number.isNaN(price) || price < 0) {
      return { ok: false, error: `Ugyldig rabatværdi: "${part}"` };
    }
    offers.push({
      qty,
      price,
      label: `${qty} for ${price}`,
    });
  }

  offers.sort((a, b) => a.qty - b.qty);
  return { ok: true, offers };
}

function parseStockValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const stock = Number(raw);
  if (!Number.isInteger(stock) || stock < 0) {
    return NaN;
  }

  return stock;
}

function reconcileCartWithProducts() {
  const validIds = new Set(state.products.map((p) => p.id));

  for (const product of state.products) {
    if (typeof state.cart[product.id] !== "number") {
      state.cart[product.id] = 0;
    }
    if (Number.isInteger(product.stock) && state.cart[product.id] > product.stock) {
      state.cart[product.id] = product.stock;
    }
  }

  for (const id of Object.keys(state.cart)) {
    if (!validIds.has(id)) {
      delete state.cart[id];
    }
  }
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(state.products));
}

function saveCart() {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(state.cart));
}

function restoreProducts() {
  const raw = localStorage.getItem(STORAGE_KEYS.products);
  if (!raw) {
    state.products = DEFAULT_PRODUCTS.map((product) => ({ ...product }));
    reconcileCartWithProducts();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      state.products = parsed.map((product) => {
        const stock = parseStockValue(product.stock);
        return {
          id: String(product.id),
          name: String(product.name),
          price: Number(product.price),
          stock: Number.isNaN(stock) ? null : stock,
          color: product.color || "#1e3a8a",
          offers: Array.isArray(product.offers)
            ? product.offers.map((offer) => ({
                qty: Number(offer.qty),
                price: Number(offer.price),
                label: offer.label || `${Number(offer.qty)} for ${Number(offer.price)}`,
              }))
            : [],
        };
      });
    } else {
      state.products = DEFAULT_PRODUCTS.map((product) => ({ ...product }));
    }
  } catch {
    state.products = DEFAULT_PRODUCTS.map((product) => ({ ...product }));
  }

  reconcileCartWithProducts();
}

function restoreCart() {
  const raw = localStorage.getItem(STORAGE_KEYS.cart);
  if (!raw) {
    reconcileCartWithProducts();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      state.cart = Object.fromEntries(
        Object.entries(parsed).map(([id, quantity]) => [
          id,
          Math.max(0, Math.floor(Number(quantity) || 0)),
        ]),
      );
    }
  } catch {
    state.cart = {};
  }

  reconcileCartWithProducts();
  saveCart();
}

function showProductAdminMsg(message) {
  if (!productAdminMsg) {
    return;
  }
  productAdminMsg.textContent = message;
  productAdminMsg.hidden = false;
}

function bestBundlePrice(quantity, product) {
  if (quantity <= 0) {
    return 0;
  }

  const bundleOptions = [...product.offers, { qty: 1, price: product.price, label: "Std" }];
  const dp = Array(quantity + 1).fill(Infinity);
  const pick = Array(quantity + 1).fill(null);
  dp[0] = 0;

  for (let i = 1; i <= quantity; i += 1) {
    for (const offer of bundleOptions) {
      if (i >= offer.qty) {
        const candidate = dp[i - offer.qty] + offer.price;
        if (candidate < dp[i]) {
          dp[i] = candidate;
          pick[i] = offer;
        }
      }
    }
  }

  const usedOffers = [];
  let i = quantity;
  while (i > 0 && pick[i]) {
    usedOffers.push(pick[i]);
    i -= pick[i].qty;
  }

  const appliedPromos = usedOffers
    .filter((offer) => offer.label !== "Std")
    .reduce((acc, offer) => {
      acc[offer.label] = (acc[offer.label] || 0) + 1;
      return acc;
    }, {});

  const notes = Object.entries(appliedPromos).map(([label, count]) => `${count}x ${label}`);

  return {
    subtotal: dp[quantity],
    unitPrice: dp[quantity] / quantity,
    notes,
  };
}

function showCheckoutMessage(message, tone = "info") {
  checkoutMsg.textContent = message;
  checkoutMsg.classList.remove("msg-success", "msg-warn", "msg-error");
  if (tone === "success") {
    checkoutMsg.classList.add("msg-success");
  } else if (tone === "warn") {
    checkoutMsg.classList.add("msg-warn");
  } else if (tone === "error") {
    checkoutMsg.classList.add("msg-error");
  }
  checkoutMsg.hidden = false;
}

function getCartLines() {
  return state.products
    .map((product) => {
      const quantity = state.cart[product.id];
      if (!quantity) {
        return null;
      }
      const pricing = bestBundlePrice(quantity, product);
      return {
        product,
        quantity,
        subtotal: pricing.subtotal,
        unitPrice: pricing.unitPrice,
        notes: pricing.notes,
        fullPrice: quantity * product.price,
        savings: quantity * product.price - pricing.subtotal,
      };
    })
    .filter(Boolean);
}

function renderProducts() {
  productGrid.innerHTML = "";

  for (const product of state.products) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "product-btn";
    const hasStock = Number.isInteger(product.stock);
    const currentQuantity = state.cart[product.id] || 0;
    const isSoldOut = hasStock && product.stock <= currentQuantity;
    btn.disabled = isSoldOut;
    btn.innerHTML = `
      <span class="name">${product.name}</span>
      <span class="price">${formatDKK(product.price)}${hasStock ? ` · ${Math.max(product.stock - currentQuantity, 0)} tilbage` : ""}</span>
    `;
    btn.addEventListener("click", () => {
      if (typeof state.cart[product.id] !== "number") {
        state.cart[product.id] = 0;
      }
      if (Number.isInteger(product.stock) && state.cart[product.id] >= product.stock) {
        showCheckoutMessage(`${product.name} er udsolgt.`, "warn");
        return;
      }
      state.cart[product.id] += 1;
      saveCart();
      checkoutMsg.hidden = true;
      renderProducts();
      renderCart();
    });
    productGrid.appendChild(btn);
  }
}

function renderCart() {
  const lines = getCartLines();
  cartBody.innerHTML = "";

  if (!lines.length) {
    const tr = document.createElement("tr");
    tr.className = "empty-row";
    tr.innerHTML = `<td colspan="4">Kurven er tom</td>`;
    cartBody.appendChild(tr);
    grandTotal.textContent = formatDKK(0);
    totalSavings.textContent = formatDKK(0);
    totalSavingsRow.hidden = true;
    return;
  }

  let total = 0;
  let savingsTotal = 0;

  for (const line of lines) {
    total += line.subtotal;
    savingsTotal += line.savings;

    const tr = document.createElement("tr");
    const noteParts = [];
    if (line.notes.length) {
      noteParts.push(`<div class="discount-note">Rabat: ${line.notes.join(", ")}</div>`);
    }
    if (line.savings > 0) {
      noteParts.push(`<div class="savings-note">Sparer ${formatDKK(line.savings)}</div>`);
    }

    tr.innerHTML = `
      <td>
        <div class="product-name">${line.product.name}</div>
        ${noteParts.join("")}
      </td>
      <td>
        <div class="qty-control">
          <button class="qty-btn" data-action="dec" data-id="${line.product.id}" type="button">-</button>
          <span class="qty-value">${line.quantity}</span>
          <button class="qty-btn" data-action="inc" data-id="${line.product.id}" type="button">+</button>
        </div>
      </td>
      <td><span class="unit-price">${formatDKK(line.unitPrice)}</span></td>
      <td><strong>${formatDKK(line.subtotal)}</strong></td>
    `;

    cartBody.appendChild(tr);
  }

  grandTotal.textContent = formatDKK(total);
  totalSavings.textContent = formatDKK(savingsTotal);
  totalSavingsRow.hidden = savingsTotal <= 0;
}

function createSale(lines, paymentType = "Normal") {
  const originalTotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const isRepresentative = paymentType === "Repræsentant";

  return {
    timestamp: new Date().toISOString(),
    paymentType,
    originalTotal,
    lines: lines.map((line) => ({
      id: line.product.id,
      name: line.product.name,
      quantity: line.quantity,
      unitPrice: isRepresentative ? 0 : Number(line.unitPrice.toFixed(2)),
      subtotal: isRepresentative ? 0 : line.subtotal,
      originalUnitPrice: Number(line.unitPrice.toFixed(2)),
      originalSubtotal: line.subtotal,
    })),
    total: isRepresentative ? 0 : originalTotal,
  };
}

function renderSalesOverview() {
  if (!salesList) {
    return;
  }

  const total = state.sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const representativeTotal = state.sales.reduce((sum, sale) => {
    if (sale.paymentType !== "Repræsentant") {
      return sum;
    }

    return sum + Number(sale.originalTotal || 0);
  }, 0);
  const itemCount = state.sales.reduce(
    (sum, sale) =>
      sum +
      (Array.isArray(sale.lines)
        ? sale.lines.reduce((lineSum, line) => lineSum + Number(line.quantity || 0), 0)
        : 0),
    0,
  );

  if (salesCount) {
    salesCount.textContent = String(state.sales.length);
  }
  if (salesTotal) {
    salesTotal.textContent = formatDKK(total);
  }
  if (repTotal) {
    repTotal.textContent = formatDKK(representativeTotal);
  }
  if (itemsTotal) {
    itemsTotal.textContent = String(itemCount);
  }

  salesList.innerHTML = "";

  if (!state.sales.length) {
    const empty = document.createElement("p");
    empty.className = "sales-empty";
    empty.textContent = "Ingen salg endnu.";
    salesList.appendChild(empty);
    return;
  }

  for (const sale of [...state.sales].reverse()) {
    const row = document.createElement("article");
    row.className = "sales-entry";
    const lines = Array.isArray(sale.lines) ? sale.lines : [];
    const lineText = lines
      .map((line) => `${line.quantity}x ${line.name}`)
      .join(", ");
    const isRepresentative = sale.paymentType === "Repræsentant";
    const entryTotal = isRepresentative ? Number(sale.originalTotal || 0) : Number(sale.total || 0);
    const paymentLabel = isRepresentative ? "Repræsentant værdi" : sale.paymentType || "Normal";
    row.innerHTML = `
      <div class="sales-entry-main">
        <strong>${formatDKK(entryTotal)}</strong>
        <span>${formatDateTime(sale.timestamp)}</span>
      </div>
      <div class="sales-entry-meta">
        <span>${paymentLabel}</span>
        <span>${lineText}</span>
      </div>
    `;
    salesList.appendChild(row);
  }
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function formatCsvAmount(value) {
  return Number(value || 0).toFixed(2).replace(".", ",");
}

function exportSalesToCsv() {
  if (!state.sales.length) {
    showCheckoutMessage("Der er ingen salg at eksportere.", "warn");
    return;
  }

  const normalSales = state.sales.filter((sale) => sale.paymentType !== "Repræsentant");
  const representativeSales = state.sales.filter((sale) => sale.paymentType === "Repræsentant");
  const normalTotal = normalSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const representativeTotal = representativeSales.reduce(
    (sum, sale) => sum + Number(sale.originalTotal || 0),
    0,
  );
  const itemCount = state.sales.reduce(
    (sum, sale) =>
      sum +
      (Array.isArray(sale.lines)
        ? sale.lines.reduce((lineSum, line) => lineSum + Number(line.quantity || 0), 0)
        : 0),
    0,
  );
  const productSummary = new Map();

  for (const sale of state.sales) {
    const lines = Array.isArray(sale.lines) ? sale.lines : [];
    const isRepresentative = sale.paymentType === "Repræsentant";
    for (const line of lines) {
      const name = line.name || "Ukendt vare";
      const current = productSummary.get(name) || {
        normalQty: 0,
        normalTotal: 0,
        representativeQty: 0,
        representativeTotal: 0,
      };
      const quantity = Number(line.quantity || 0);
      if (isRepresentative) {
        current.representativeQty += quantity;
        current.representativeTotal += Number(line.originalSubtotal || 0);
      } else {
        current.normalQty += quantity;
        current.normalTotal += Number(line.subtotal || 0);
      }
      productSummary.set(name, current);
    }
  }

  const rows = [
    ["OSS Kiosk salgsrapport"],
    ["Eksporteret", formatDateTime(new Date().toISOString())],
    [],
    ["Opsummering"],
    ["Salg i alt", state.sales.length],
    ["Normale salg", normalSales.length],
    ["Repræsentant salg", representativeSales.length],
    ["Varer solgt i alt", itemCount],
    ["Omsætning normal", formatCsvAmount(normalTotal)],
    ["Repræsentant værdi", formatCsvAmount(representativeTotal)],
    ["Samlet vareværdi", formatCsvAmount(normalTotal + representativeTotal)],
    [],
    ["Varesalg"],
    [
      "Vare",
      "Normal antal",
      "Normal omsætning",
      "Repræsentant antal",
      "Repræsentant værdi",
      "Antal i alt",
      "Værdi i alt",
    ],
  ];

  for (const [name, summary] of [...productSummary.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "da"),
  )) {
    rows.push([
      name,
      summary.normalQty,
      formatCsvAmount(summary.normalTotal),
      summary.representativeQty,
      formatCsvAmount(summary.representativeTotal),
      summary.normalQty + summary.representativeQty,
      formatCsvAmount(summary.normalTotal + summary.representativeTotal),
    ]);
  }

  rows.push(
    [],
    ["Salgslinjer"],
    [
      "Salg nr.",
      "Tidspunkt",
      "Betalingstype",
      "Vare",
      "Antal",
      "Pris/stk",
      "Betalt subtotal",
      "Repræsentant værdi",
      "Salg total betalt",
      "Salg total vareværdi",
    ],
  );

  state.sales.forEach((sale, index) => {
    const lines = Array.isArray(sale.lines) ? sale.lines : [];
    const isRepresentative = sale.paymentType === "Repræsentant";
    for (const line of lines) {
      rows.push([
        index + 1,
        formatDateTime(sale.timestamp),
        sale.paymentType || "Normal",
        line.name,
        Number(line.quantity || 0),
        formatCsvAmount(line.originalUnitPrice ?? line.unitPrice ?? 0),
        formatCsvAmount(line.subtotal || 0),
        isRepresentative ? formatCsvAmount(line.originalSubtotal || 0) : "",
        formatCsvAmount(sale.total || 0),
        formatCsvAmount(isRepresentative ? sale.originalTotal || 0 : sale.total || 0),
      ]);
    }
  });

  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `oss-kiosk-salg-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function clearCart() {
  for (const product of state.products) {
    state.cart[product.id] = 0;
  }
}

cartBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const { action, id } = button.dataset;
  if (!id || !state.cart[id]) {
    return;
  }

  if (action === "inc") {
    const product = state.products.find((p) => p.id === id);
    if (product && Number.isInteger(product.stock) && state.cart[id] >= product.stock) {
      showCheckoutMessage(`${product.name} er udsolgt.`, "warn");
      return;
    }
    state.cart[id] += 1;
  }

  if (action === "dec") {
    state.cart[id] -= 1;
  }

  saveCart();
  checkoutMsg.hidden = true;
  renderProducts();
  renderCart();
});

function handleCheckout(paymentType) {
  const lines = getCartLines();
  if (!lines.length) {
    showCheckoutMessage("Kurven er tom.", "warn");
    return;
  }

  const sale = createSale(lines, paymentType);
  state.sales.push(sale);
  localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(state.sales));

  for (const line of lines) {
    if (Number.isInteger(line.product.stock)) {
      line.product.stock = Math.max(line.product.stock - line.quantity, 0);
    }
  }
  clearCart();
  saveCart();
  saveProducts();
  renderProducts();
  renderProductAdmin();
  renderCart();
  renderSalesOverview();

  if (paymentType === "Repræsentant") {
    showCheckoutMessage("Repræsentant-salg gemt.", "success");
  } else {
    showCheckoutMessage("Salg gemt.", "success");
  }
}

checkoutBtn.addEventListener("click", () => {
  handleCheckout("Normal");
});

if (repCheckoutBtn) {
  repCheckoutBtn.addEventListener("click", () => {
    handleCheckout("Repræsentant");
  });
}

function renderProductAdmin() {
  if (!productAdminList) {
    return;
  }

  productAdminList.innerHTML = "";

  const header = document.createElement("div");
  header.className = "product-admin-header";
  header.innerHTML = `
    <span>Vare</span>
    <span>Tilbage</span>
    <span>Pris</span>
    <span>Rabat</span>
    <span></span>
    <span></span>
  `;
  productAdminList.appendChild(header);

  for (const product of state.products) {
    const row = document.createElement("div");
    row.className = "product-admin-row";
    row.innerHTML = `
      <input class="settings-input" data-field="name" data-id="${product.id}" value="${product.name}" />
      <input class="settings-input" data-field="stock" data-id="${product.id}" type="number" step="1" min="0" placeholder="Tilbage" value="${Number.isInteger(product.stock) ? product.stock : ""}" />
      <input class="settings-input" data-field="price" data-id="${product.id}" type="number" step="0.01" min="0" value="${Number(product.price).toFixed(2)}" />
      <input class="settings-input" data-field="offers" data-id="${product.id}" type="text" placeholder="3=12,5=15" value="${offersToText(product.offers)}" />
      <button class="product-admin-save" data-action="save" data-id="${product.id}" type="button">Gem</button>
      <button class="product-admin-delete" data-action="delete" data-id="${product.id}" type="button">Slet</button>
    `;
    productAdminList.appendChild(row);
  }
}

if (productAdminList) {
  productAdminList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const { action, id } = button.dataset;
    if (!id) {
      return;
    }

    const index = state.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return;
    }

    if (action === "delete") {
      state.products.splice(index, 1);
      reconcileCartWithProducts();
      saveCart();
      saveProducts();
      renderProducts();
      renderProductAdmin();
      renderCart();
      showProductAdminMsg("Vare slettet.");
      return;
    }

    if (action === "save") {
      const nameInput = productAdminList.querySelector(`input[data-field="name"][data-id="${id}"]`);
      const stockInput = productAdminList.querySelector(`input[data-field="stock"][data-id="${id}"]`);
      const priceInput = productAdminList.querySelector(`input[data-field="price"][data-id="${id}"]`);
      const offersInput = productAdminList.querySelector(`input[data-field="offers"][data-id="${id}"]`);
      const nextName = nameInput ? nameInput.value.trim() : "";
      const nextStock = parseStockValue(stockInput ? stockInput.value : "");
      const nextPrice = priceInput ? Number(priceInput.value) : NaN;
      const parsedOffers = parseOffersText(offersInput ? offersInput.value : "");

      if (!nextName || Number.isNaN(nextPrice) || nextPrice < 0) {
        showProductAdminMsg("Ugyldigt navn eller pris.");
        return;
      }
      if (Number.isNaN(nextStock)) {
        showProductAdminMsg("Lager skal være et helt tal på 0 eller mere.");
        return;
      }
      if (!parsedOffers.ok) {
        showProductAdminMsg(parsedOffers.error);
        return;
      }

      state.products[index].name = nextName;
      state.products[index].stock = nextStock;
      state.products[index].price = nextPrice;
      state.products[index].offers = parsedOffers.offers;
      reconcileCartWithProducts();
      saveCart();
      saveProducts();
      renderProducts();
      renderProductAdmin();
      renderCart();
      showProductAdminMsg("Vare opdateret.");
    }
  });
}

if (addProductBtn) {
  addProductBtn.addEventListener("click", () => {
    const name = newProductNameInput ? newProductNameInput.value.trim() : "";
    const stock = parseStockValue(newProductStockInput ? newProductStockInput.value : "");
    const price = newProductPriceInput ? Number(newProductPriceInput.value) : NaN;
    const parsedOffers = parseOffersText(newProductOffersInput ? newProductOffersInput.value : "");
    if (!name || Number.isNaN(price) || price < 0) {
      showProductAdminMsg("Skriv gyldigt navn og pris.");
      return;
    }
    if (Number.isNaN(stock)) {
      showProductAdminMsg("Lager skal være et helt tal på 0 eller mere.");
      return;
    }
    if (!parsedOffers.ok) {
      showProductAdminMsg(parsedOffers.error);
      return;
    }

    let baseId = slugify(name) || "vare";
    let id = baseId;
    let suffix = 2;
    while (state.products.some((p) => p.id === id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    state.products.push({
      id,
      name,
      stock,
      price,
      color: "#1e3a8a",
      offers: parsedOffers.offers,
    });

    reconcileCartWithProducts();
    saveCart();
    saveProducts();
    renderProducts();
    renderProductAdmin();
    renderCart();
    if (newProductNameInput) {
      newProductNameInput.value = "";
    }
    if (newProductPriceInput) {
      newProductPriceInput.value = "";
    }
    if (newProductStockInput) {
      newProductStockInput.value = "";
    }
    if (newProductOffersInput) {
      newProductOffersInput.value = "";
    }
    showProductAdminMsg("Vare oprettet.");
  });
}

if (clearSalesBtn) {
  clearSalesBtn.addEventListener("click", () => {
    const shouldClear = window.confirm("Vil du rydde alle gemte salg?");
    if (!shouldClear) {
      return;
    }

    state.sales = [];
    localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(state.sales));
    renderSalesOverview();
  });
}

if (exportSalesBtn) {
  exportSalesBtn.addEventListener("click", exportSalesToCsv);
}

if (productAdminDrawer) {
  productAdminDrawer.addEventListener("toggle", () => {
    if (!productAdminDrawer.open) {
      isProductAdminUnlocked = false;
      return;
    }

    if (isProductAdminUnlocked) {
      return;
    }

    const enteredPin = window.prompt("Indtast kode for at åbne Varer & priser:");
    if (enteredPin === PRODUCT_ADMIN_PIN) {
      isProductAdminUnlocked = true;
      showProductAdminMsg("Adgang godkendt.");
      return;
    }

    productAdminDrawer.open = false;
    showProductAdminMsg("Forkert kode.");
  });
}

function restoreSales() {
  const raw = localStorage.getItem(STORAGE_KEYS.sales);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      state.sales = parsed;
    }
  } catch {
    state.sales = [];
  }
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);
  if (themeToggle) {
    themeToggle.textContent = isDark ? "Lys mode" : "Dark mode";
  }
}

function restoreTheme() {
  const theme = localStorage.getItem(STORAGE_KEYS.theme) || "light";
  applyTheme(theme);
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme = document.body.classList.contains("dark-mode") ? "dark" : "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
    applyTheme(nextTheme);
  });
}

window.addEventListener("pagehide", () => {
  saveCart();
  saveProducts();
  localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(state.sales));
});

restoreSales();
restoreProducts();
restoreCart();
restoreTheme();
renderProducts();
renderProductAdmin();
renderCart();
renderSalesOverview();
