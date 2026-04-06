// ===== PriceScan v2 — app.js (with Specifications) =====
// Replace with your FREE Groq API key from console.groq.com

const API_KEY = 'YOUR_GROQ_API_KEY';

const SITES = [
  { name: 'Amazon IN',        short: 'AMZ', bg: '#FF9900', color: '#000',    region: 'in,global', cats: 'electronics,fashion,all', baseUrl: 'https://www.amazon.in/s?k=' },
  { name: 'Flipkart',         short: 'FK',  bg: '#2874F0', color: '#fff',    region: 'in',        cats: 'electronics,fashion,all', baseUrl: 'https://www.flipkart.com/search?q=' },
  { name: 'Meesho',           short: 'MS',  bg: '#F43397', color: '#fff',    region: 'in',        cats: 'fashion,all',             baseUrl: 'https://www.meesho.com/search?q=' },
  { name: 'Croma',            short: 'CR',  bg: '#67B346', color: '#fff',    region: 'in',        cats: 'electronics,all',         baseUrl: 'https://www.croma.com/searchB?q=' },
  { name: 'Reliance Digital', short: 'RD',  bg: '#004B87', color: '#fff',    region: 'in',        cats: 'electronics,all',         baseUrl: 'https://www.reliancedigital.in/search?q=' },
  { name: 'Amazon Global',    short: 'AMG', bg: '#232F3E', color: '#FF9900', region: 'global',    cats: 'electronics,fashion,all', baseUrl: 'https://www.amazon.com/s?k=' },
  { name: 'eBay',             short: 'EB',  bg: '#E53238', color: '#fff',    region: 'global',    cats: 'electronics,fashion,all', baseUrl: 'https://www.ebay.com/sch/i.html?_nkw=' },
  { name: 'Walmart',          short: 'WM',  bg: '#0071CE', color: '#fff',    region: 'global',    cats: 'electronics,fashion,all', baseUrl: 'https://www.walmart.com/search?q=' },
  { name: 'Myntra',           short: 'MY',  bg: '#FF3F6C', color: '#fff',    region: 'in',        cats: 'fashion,all',             baseUrl: 'https://www.myntra.com/' },
  { name: 'Snapdeal',         short: 'SD',  bg: '#E40000', color: '#fff',    region: 'in',        cats: 'all',                     baseUrl: 'https://www.snapdeal.com/search?keyword=' },
];

let activeFilter = 'all';
let lastPrices   = [];
let lastSpecs    = null;
let activeTab    = 'prices';
let currentQuery = '';

// ---- Tabs ----
function switchTab(tab) {
  activeTab = tab;
  document.getElementById('tab-prices').classList.toggle('active', tab === 'prices');
  document.getElementById('tab-specs').classList.toggle('active', tab === 'specs');
  document.getElementById('prices-panel').style.display = tab === 'prices' ? 'block' : 'none';
  document.getElementById('specs-panel').style.display  = tab === 'specs'  ? 'block' : 'none';
}

// ---- Filters ----
function toggleFilter(el) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  activeFilter = el.dataset.f;
  if (lastPrices.length) updatePricesPanel(lastPrices, currentQuery);
}

function filterSites() {
  return SITES.filter(s => {
    if (activeFilter === 'all')    return true;
    if (activeFilter === 'in')     return s.region.includes('in');
    if (activeFilter === 'global') return s.region.includes('global');
    return s.cats.includes(activeFilter);
  });
}

// ---- Main Search ----
async function doSearch() {
  const q = document.getElementById('queryInput').value.trim();
  if (!q) return;
  currentQuery = q;

  const btn = document.getElementById('searchBtn');
  btn.disabled = true;
  btn.textContent = '...';
  showLoading();

  try {
    const [prices, specs] = await Promise.all([fetchPrices(q), fetchSpecs(q)]);
    lastPrices = prices;
    lastSpecs  = specs;
    renderAll(prices, specs, q);
  } catch (err) {
    showError(err.message);
  }

  btn.disabled = false;
  btn.textContent = 'SCAN ›';
}

// ---- Groq API Call ----
async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + API_KEY,
    },
    body: JSON.stringify({
      model:      'llama3-8b-8192',
      max_tokens: 1200,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'API error');
  return data.choices[0].message.content;
}

// ---- Fetch Prices ----
async function fetchPrices(q) {
  const text = await callGroq(
    `You are a price comparison engine. For the product "${q}", simulate realistic current Indian and global market prices. Return ONLY a valid JSON array — no markdown, no explanation.

Each object must have: site (one of "Amazon IN","Flipkart","Meesho","Croma","Reliance Digital","Amazon Global","eBay","Walmart","Myntra","Snapdeal"), price (number, INR for Indian sites, USD for global), currency ("INR" or "USD"), availability ("In Stock" or "Out of Stock" or "Limited Stock"), rating (3.5 to 5.0, 1 decimal), delivery (e.g. "2-3 days").

Include all 10 sites. Vary prices naturally 10-25%.`
  );
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

// ---- Fetch Specs ----
async function fetchSpecs(q) {
  const text = await callGroq(
    `You are a product specification expert. For the product "${q}", provide detailed specifications. Return ONLY a valid JSON object — no markdown, no explanation.

Format exactly:
{
  "productName": "full product name",
  "category": "product category",
  "overallScore": number 1-100,
  "specs": [{"key": "spec name", "value": "spec value", "highlight": true or false}],
  "pros": ["pro 1", "pro 2", "pro 3", "pro 4"],
  "cons": ["con 1", "con 2", "con 3"],
  "verdict": "2-3 sentence expert verdict"
}

Include 8-12 most important specs. Set highlight:true for the best standout specs.`
  );
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

// ---- Loading / Error ----
function showLoading() {
  document.getElementById('mainArea').innerHTML = `
    <div class="status-bar">
      <span class="spinner"></span>scanning prices &amp; fetching specs...
    </div>
    <div class="loading-row">
      ${Array(4).fill('<div class="skeleton"></div>').join('')}
    </div>`;
}

function showError(msg) {
  document.getElementById('mainArea').innerHTML = `
    <div class="empty">
      <div class="empty-icon">⚠</div>
      <div>error — ${msg || 'check your Groq API key'}</div>
    </div>`;
}

// ---- Render Everything ----
function renderAll(prices, specs, query) {
  const siteNames = filterSites().map(s => s.name);
  const filtered  = prices.filter(r => siteNames.includes(r.site));
  const inStock   = filtered.filter(r => r.availability !== 'Out of Stock');
  const inrItems  = inStock.filter(r => r.currency === 'INR');
  const usdItems  = inStock.filter(r => r.currency === 'USD');

  let allNorm = [];
  if (inrItems.length) { const m = Math.min(...inrItems.map(r=>r.price)); inrItems.forEach(r=>allNorm.push({...r,min:m})); }
  if (usdItems.length) { const m = Math.min(...usdItems.map(r=>r.price)); usdItems.forEach(r=>allNorm.push({...r,min:m})); }
  const sorted = allNorm.sort((a,b) => a.price - b.price);

  const bestINR = inrItems.length ? Math.min(...inrItems.map(r=>r.price)) : null;
  const avgINR  = inrItems.length ? Math.round(inrItems.reduce((s,r)=>s+r.price,0)/inrItems.length) : null;
  const saving  = bestINR && avgINR ? Math.round(avgINR - bestINR) : null;

  // Summary bar
  const summaryHTML = `
    <div class="summary-bar">
      <div class="summary-item"><div class="summary-label">Sites Scanned</div><div class="summary-value cyan">${filtered.length}</div></div>
      <div class="summary-item"><div class="summary-label">In Stock</div><div class="summary-value purple">${inStock.length}</div></div>
      ${bestINR ? `<div class="summary-item"><div class="summary-label">Best Price</div><div class="summary-value green">₹${bestINR.toLocaleString()}</div></div>` : ''}
      ${saving && saving > 0 ? `<div class="summary-item"><div class="summary-label">Max Saving</div><div class="summary-value green">₹${saving.toLocaleString()}</div></div>` : ''}
      ${specs  ? `<div class="summary-item"><div class="summary-label">Overall Score</div><div class="summary-value cyan">${specs.overallScore}/100</div></div>` : ''}
    </div>`;

  // Tabs
  const tabsHTML = `
    <div class="tabs">
      <button class="tab active" id="tab-prices" onclick="switchTab('prices')">💰 Price Comparison</button>
      <button class="tab"        id="tab-specs"  onclick="switchTab('specs')">📋 Specifications</button>
    </div>`;

  // Price cards
  const priceCards = sorted.map((r, i) => {
    const site     = SITES.find(s => s.name === r.site) || { short: '??', bg: '#333', color: '#fff', baseUrl: '' };
    const isBest   = i === 0;
    const diffPct  = r.price > r.min ? Math.round(((r.price - r.min) / r.min) * 100) : 0;
    const curr     = r.currency === 'INR' ? '₹' : '$';
    const priceStr = r.currency === 'INR' ? `${curr}${r.price.toLocaleString()}` : `${curr}${r.price.toFixed(2)}`;
    const availColor = r.availability === 'In Stock' ? '#10b981' : r.availability === 'Limited Stock' ? '#f59e0b' : '#ef4444';

    return `
      <div class="result-card${isBest ? ' best' : ''}">
        <div class="site-logo" style="background:${site.bg};color:${site.color}">${site.short}</div>
        <div class="site-info">
          <div class="site-name">${r.site}</div>
          <div class="site-meta">
            <span style="color:${availColor}">● ${r.availability}</span>
            <span class="mono">★ ${r.rating}</span>
            <span class="mono">🚚 ${r.delivery}</span>
          </div>
        </div>
        <div class="price-col">
          <div class="price${isBest ? ' best-price' : ''}">${priceStr}</div>
          ${diffPct > 0 ? `<div class="diff-badge diff-more">+${diffPct}% more</div>` : `<div class="diff-badge diff-best">lowest</div>`}
        </div>
        <a class="visit-btn" href="${site.baseUrl + encodeURIComponent(query)}" target="_blank" rel="noopener">visit →</a>
      </div>`;
  }).join('');

  const outCount = filtered.filter(r => r.availability === 'Out of Stock').length;
  const pricesPanel = `
    <div class="results-grid">${priceCards}</div>
    ${outCount > 0 ? `<div class="out-note"><div class="dot-m"></div>${outCount} site(s) out of stock — not shown</div>` : ''}`;

  // Specs panel
  let specsPanel = '<div class="empty"><div class="empty-icon">⚠</div><div>specs unavailable</div></div>';
  if (specs) {
    const specRows = specs.specs.map(s => {
      const cls = s.highlight ? 'spec-val highlight' : 'spec-val';
      return `<div class="spec-row"><div class="spec-key">${s.key}</div><div class="${cls}">${s.value}</div></div>`;
    }).join('');

    const scoreW  = Math.round((specs.overallScore / 100) * 100);
    const prosHTML = specs.pros.map(p => `<div class="pc-item">${p}</div>`).join('');
    const consHTML = specs.cons.map(c => `<div class="pc-item">${c}</div>`).join('');

    specsPanel = `
      <div class="spec-panel">
        <div class="spec-header">
          <div>
            <div class="spec-title">${specs.productName}</div>
            <div class="spec-subtitle">${specs.category}</div>
          </div>
          <div class="spec-score">
            <div class="score-bar-wrap"><div class="score-bar" style="width:${scoreW}%"></div></div>
            <div class="score-val">${specs.overallScore}/100</div>
          </div>
        </div>
        <div class="spec-grid">${specRows}</div>
        <div class="pros-cons">
          <div class="pros"><div class="pc-title">PROS</div>${prosHTML}</div>
          <div class="cons"><div class="pc-title">CONS</div>${consHTML}</div>
        </div>
        <div class="verdict">
          <div class="verdict-label">EXPERT VERDICT</div>
          <div class="verdict-text">${specs.verdict}</div>
        </div>
      </div>`;
  }

  document.getElementById('mainArea').innerHTML = `
    <div class="status-bar">
      <div class="pulse"></div>
      results for "<span style="color:var(--accent)">${escapeHtml(query)}</span>"
    </div>
    ${summaryHTML}
    ${tabsHTML}
    <div id="prices-panel">${pricesPanel}</div>
    <div id="specs-panel"  style="display:none">${specsPanel}</div>`;

  activeTab = 'prices';
}

// ---- Update price panel on filter change ----
function updatePricesPanel(prices, query) {
  const panel = document.getElementById('prices-panel');
  if (!panel) return;

  const siteNames = filterSites().map(s => s.name);
  const filtered  = prices.filter(r => siteNames.includes(r.site));
  const inStock   = filtered.filter(r => r.availability !== 'Out of Stock');
  const inrItems  = inStock.filter(r => r.currency === 'INR');
  const usdItems  = inStock.filter(r => r.currency === 'USD');

  let allNorm = [];
  if (inrItems.length) { const m = Math.min(...inrItems.map(r=>r.price)); inrItems.forEach(r=>allNorm.push({...r,min:m})); }
  if (usdItems.length) { const m = Math.min(...usdItems.map(r=>r.price)); usdItems.forEach(r=>allNorm.push({...r,min:m})); }
  const sorted = allNorm.sort((a,b) => a.price - b.price);

  const cards = sorted.map((r, i) => {
    const site     = SITES.find(s => s.name === r.site) || { short: '??', bg: '#333', color: '#fff', baseUrl: '' };
    const isBest   = i === 0;
    const diffPct  = r.price > r.min ? Math.round(((r.price - r.min) / r.min) * 100) : 0;
    const curr     = r.currency === 'INR' ? '₹' : '$';
    const priceStr = r.currency === 'INR' ? `${curr}${r.price.toLocaleString()}` : `${curr}${r.price.toFixed(2)}`;
    const availColor = r.availability === 'In Stock' ? '#10b981' : r.availability === 'Limited Stock' ? '#f59e0b' : '#ef4444';

    return `
      <div class="result-card${isBest ? ' best' : ''}">
        <div class="site-logo" style="background:${site.bg};color:${site.color}">${site.short}</div>
        <div class="site-info">
          <div class="site-name">${r.site}</div>
          <div class="site-meta">
            <span style="color:${availColor}">● ${r.availability}</span>
            <span class="mono">★ ${r.rating}</span>
            <span class="mono">🚚 ${r.delivery}</span>
          </div>
        </div>
        <div class="price-col">
          <div class="price${isBest ? ' best-price' : ''}">${priceStr}</div>
          ${diffPct > 0 ? `<div class="diff-badge diff-more">+${diffPct}% more</div>` : `<div class="diff-badge diff-best">lowest</div>`}
        </div>
        <a class="visit-btn" href="${site.baseUrl + encodeURIComponent(query)}" target="_blank" rel="noopener">visit →</a>
      </div>`;
  }).join('');

  panel.innerHTML = `<div class="results-grid">${cards}</div>`;
}

// ---- Utility ----
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ---- Enter key ----
document.getElementById('queryInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});
