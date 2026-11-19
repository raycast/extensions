/*
 * Geneh lite: the few things the Telegram bot, the Google Sheets add-on and the browser extension need from the public
 * feed (https://data.geneh.app/v1/latest.json and catalog.json). Same rules as the site (apps/web core/prices.ts and
 * core/freshness.ts): the Central Bank is a reference and never a best rate, and a bank whose price is older than its
 * dataset allows is set aside unless every bank is.
 *
 * This file has no imports and ends with one `export` line, so Apps Script can take it as is once that line is cut
 * (apps/sheets/build.mjs) and the extension can load it as a module.
 */

var GENEH_FEED = { prod: 'https://data.geneh.app/', dev: 'https://data.dev.geneh.app/' };

/**
 * Geneh's social profiles for the bot, the extension and the Sheets add-on: a copy of GENEH_SOCIAL in
 * packages/contracts/src/social.ts, the source of truth. Its social.test.ts fails until this copy matches.
 */
var GENEH_SOCIAL = [
  { id: 'facebook', label: 'Facebook', handle: 'geneh.egypt', url: 'https://www.facebook.com/geneh.egypt' },
  { id: 'instagram', label: 'Instagram', handle: '@geneh.egypt', url: 'https://www.instagram.com/geneh.egypt' },
  { id: 'x', label: 'X', handle: '@geneh_egypt', url: 'https://x.com/geneh_egypt' },
  { id: 'tiktok', label: 'TikTok', handle: '@geneh.app', url: 'https://www.tiktok.com/@geneh.app' },
  { id: 'youtube', label: 'YouTube', handle: '@geneh_egypt', url: 'https://www.youtube.com/@geneh_egypt' },
  { id: 'linkedin', label: 'LinkedIn', handle: 'geneh-egypt', url: 'https://www.linkedin.com/company/geneh-egypt' },
];

/** Minutes after which a quote counts as behind (packages/contracts freshness MAX_AGE_MS, for the datasets used here). */
var GENEH_MAX_AGE_MIN = { fx_bank: 6 * 60, fx_cbe: 3 * 24 * 60, gold: 3 * 60, silver: 6 * 60, metal_spot: 3 * 60 };

/** Currency order on every list (the site's CCY_ORDER). */
var GENEH_CCY = ['usd', 'eur', 'sar', 'gbp', 'aed', 'kwd', 'qar', 'omr', 'bhd', 'jod', 'chf', 'cad', 'aud', 'jpy', 'cny', 'sek', 'nok', 'dkk'];

/** Currency names, kept short for chat replies and small popups. */
var GENEH_CCY_NAMES = {
  usd: ['US dollar', 'الدولار'], eur: ['Euro', 'اليورو'], sar: ['Saudi riyal', 'الريال السعودي'], gbp: ['British pound', 'الجنيه الإسترليني'],
  aed: ['UAE dirham', 'الدرهم الإماراتي'], kwd: ['Kuwaiti dinar', 'الدينار الكويتي'], qar: ['Qatari riyal', 'الريال القطري'],
  omr: ['Omani rial', 'الريال العماني'], bhd: ['Bahraini dinar', 'الدينار البحريني'], jod: ['Jordanian dinar', 'الدينار الأردني'],
  chf: ['Swiss franc', 'الفرنك السويسري'], cad: ['Canadian dollar', 'الدولار الكندي'], aud: ['Australian dollar', 'الدولار الأسترالي'],
  jpy: ['Japanese yen (100)', 'الين الياباني (100)'], cny: ['Chinese yuan', 'اليوان الصيني'], sek: ['Swedish krona', 'الكرونة السويدية'],
  nok: ['Norwegian krone', 'الكرونة النرويجية'], dkk: ['Danish krone', 'الكرونة الدنماركية'],
};

/** Gold and silver the feed prices, by what people type: 21, 24k, pound; 925, 999. */
var GENEH_GOLD = { '24': 'xau_24k_g', '22': 'xau_22k_g', '21': 'xau_21k_g', '18': 'xau_18k_g', '14': 'xau_14k_g', pound: 'xau_pound' };
var GENEH_SILVER = { '999': 'xag_999_g', '925': 'xag_925_g', '900': 'xag_900_g', '800': 'xag_800_g', '600': 'xag_600_g', pound: 'xag_pound' };

/** Lower-case currency code from what someone typed ("USD", "$", "دولار"), or null. */
function genehCurrency(text) {
  var s = String(text == null ? '' : text).trim().toLowerCase();
  var alias = { '$': 'usd', 'dollar': 'usd', 'دولار': 'usd', 'الدولار': 'usd', '€': 'eur', 'euro': 'eur', 'يورو': 'eur', 'اليورو': 'eur',
    '£': 'gbp', 'pound sterling': 'gbp', 'استرليني': 'gbp', 'إسترليني': 'gbp', 'riyal': 'sar', 'ريال': 'sar', 'سعودي': 'sar', 'dirham': 'aed',
    'درهم': 'aed', 'dinar': 'kwd', 'دينار': 'kwd', 'yen': 'jpy', 'ين': 'jpy', 'yuan': 'cny', 'يوان': 'cny' };
  if (alias[s]) return alias[s];
  return GENEH_CCY.indexOf(s) >= 0 ? s : null;
}

/** Gold instrument id from "21", "21k", "عيار 21", "pound", "جنيه". */
function genehGoldId(text) {
  var s = String(text == null ? '21' : text).trim().toLowerCase().replace(/^عيار\s*/, '').replace(/k$|قيراط$/, '').trim();
  if (s === '' ) s = '21';
  if (s === 'جنيه' || s === 'جنيه ذهب' || s === 'coin') s = 'pound';
  return GENEH_GOLD[s] || null;
}

function genehSilverId(text) {
  var s = String(text == null ? '999' : text).trim().toLowerCase().replace(/^عيار\s*/, '').trim();
  if (s === '') s = '999';
  if (s === 'جنيه' || s === 'coin') s = 'pound';
  return GENEH_SILVER[s] || null;
}

function genehAt(snapshot) {
  var t = Date.parse(snapshot && snapshot.generatedAt);
  return isFinite(t) ? t : Date.now();
}

/** A quote we couldn't read again in time (the site's isBehind). */
function genehBehind(q, at) {
  if (q.stale === true) return true;
  var max = GENEH_MAX_AGE_MIN[q.dataset] || 6 * 60;
  return at - Date.parse(q.observedAt) > max * 60000;
}

/**
 * One currency across banks: the Central Bank's rate, every bank's buy and sell, and the best of each.
 * best.sell is the lowest price a bank sells at (where buying the currency is cheapest); best.buy is the highest price
 * a bank buys at (where selling it pays most). Null when the feed has no bank quotes for it.
 */
function genehBoard(snapshot, ccy) {
  var c = genehCurrency(ccy);
  if (!c || !snapshot || !snapshot.quotes) return null;
  var at = genehAt(snapshot);
  var cbe = null;
  var all = [];
  for (var i = 0; i < snapshot.quotes.length; i++) {
    var q = snapshot.quotes[i];
    if (q.instrument !== c) continue;
    if (q.dataset === 'fx_cbe' && q.source === 'cbe') cbe = { buy: q.buy, sell: q.sell, at: q.changedAt };
    else if (q.dataset === 'fx_bank' && q.source !== 'cbe' && q.buy != null && q.sell != null) all.push(q);
  }
  if (!all.length && !cbe) return null;
  var fresh = all.filter(function (q) { return !genehBehind(q, at); });
  var ranked = fresh.length ? fresh : all;
  var banks = all.map(function (q) {
    return { bank: q.source, buy: q.buy, sell: q.sell, behind: ranked.indexOf(q) < 0, changedAt: q.changedAt };
  }).sort(function (a, b) { return (a.behind - b.behind) || (a.sell - b.sell); });
  var best = null;
  if (ranked.length) {
    var minSell = Math.min.apply(null, ranked.map(function (q) { return q.sell; }));
    var maxBuy = Math.max.apply(null, ranked.map(function (q) { return q.buy; }));
    best = {
      sell: { rate: minSell, banks: ranked.filter(function (q) { return q.sell === minSell; }).map(function (q) { return q.source; }) },
      buy: { rate: maxBuy, banks: ranked.filter(function (q) { return q.buy === maxBuy; }).map(function (q) { return q.source; }) },
    };
  }
  return { currency: c, unit: c === 'jpy' ? 100 : 1, cbe: cbe, best: best, banks: banks, updatedAt: snapshot.generatedAt };
}

/** A gold or silver price: { instrument, buy, sell, changedAt, behind }, or null. kind is 'gold' or 'silver'. */
function genehMetal(snapshot, kind, which) {
  var id = kind === 'silver' ? genehSilverId(which) : genehGoldId(which);
  if (!id || !snapshot || !snapshot.quotes) return null;
  var at = genehAt(snapshot);
  for (var i = 0; i < snapshot.quotes.length; i++) {
    var q = snapshot.quotes[i];
    if (q.instrument === id && q.dataset === (kind === 'silver' ? 'silver' : 'gold')) {
      return { instrument: id, buy: q.buy, sell: q.sell, changedAt: q.changedAt, behind: genehBehind(q, at) };
    }
  }
  return null;
}

/** World spot price in USD an ounce: kind 'gold' or 'silver'. */
function genehSpot(snapshot, kind) {
  var id = kind === 'silver' ? 'xag_usd_oz' : 'xau_usd_oz';
  var qs = (snapshot && snapshot.quotes) || [];
  for (var i = 0; i < qs.length; i++) if (qs[i].instrument === id) return qs[i].mid != null ? qs[i].mid : qs[i].sell;
  return null;
}

/**
 * EGP for one unit of a currency. basis: 'cbe' (the Central Bank's mid, the default), 'buy' (the best a bank pays you)
 * or 'sell' (the cheapest a bank sells at). Falls back to the bank average when the Central Bank has no rate.
 */
function genehEgpPer(snapshot, ccy, basis) {
  var c = genehCurrency(ccy);
  if (c === null && String(ccy).toLowerCase() === 'egp') return 1;
  var b = genehBoard(snapshot, c);
  if (!b) return null;
  var per;
  if (basis === 'buy' && b.best) per = b.best.buy.rate;
  else if (basis === 'sell' && b.best) per = b.best.sell.rate;
  else if (b.cbe && b.cbe.buy != null && b.cbe.sell != null) per = (b.cbe.buy + b.cbe.sell) / 2;
  else if (b.banks.length) per = b.banks.reduce(function (s, x) { return s + (x.buy + x.sell) / 2; }, 0) / b.banks.length;
  else return null;
  return per / b.unit;
}

/** amount in `from` as `to` (either can be 'egp'), through EGP. */
function genehConvert(snapshot, amount, from, to, basis) {
  var a = Number(amount);
  if (!isFinite(a)) return null;
  var f = String(from).toLowerCase() === 'egp' ? 1 : genehEgpPer(snapshot, from, basis);
  var t = String(to == null ? 'egp' : to).toLowerCase() === 'egp' ? 1 : genehEgpPer(snapshot, to, basis);
  if (f == null || t == null) return null;
  return (a * f) / t;
}

/** Bank names from catalog.json: { id: { en, ar } }. */
function genehBankNames(catalog) {
  var out = {};
  var banks = (catalog && catalog.banks) || [];
  for (var i = 0; i < banks.length; i++) out[banks[i].id] = banks[i].name;
  return out;
}

/** A number the way the site shows it: 2 decimals when it has a fraction (53.40), none when whole (6,240). Tarek 2026-11-09. */
function genehFmt(n, lang) {
  if (n == null || !isFinite(n)) return lang === 'ar' ? 'غير متاح' : 'N/A';
  var d = Math.round(n * 100) % 100 ? 2 : 0;
  return Number(n).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

/**
 * "1,299.99" and "1.299,99" both as 1299.99. With both marks the later one is the decimal mark. With one mark used
 * once, three digits after it means thousands ("1,299") and one or two means decimals ("12,5"); used more than once,
 * it is a thousands separator.
 */
function genehNormalizeNumber(num) {
  var dot = num.lastIndexOf('.');
  var comma = num.lastIndexOf(',');
  if (dot >= 0 && comma >= 0) return dot > comma ? num.replace(/,/g, '') : num.replace(/\./g, '').replace(',', '.');
  var mark = dot >= 0 ? '.' : comma >= 0 ? ',' : null;
  if (!mark) return num;
  var parts = num.split(mark);
  if (parts.length > 2 || parts[1].length === 3) return parts.join('');
  return parts[0] + '.' + parts[1];
}

/** Foreign amounts written on a page: "$1,299.99", "EUR 50", "50 €", "1.200,50 €", "SAR 300". */
function genehFindAmount(text) {
  var s = String(text == null ? '' : text).replace(/\u00a0/g, ' ').trim();
  if (!s || s.length > 60) return null;
  var sym = { '$': 'usd', 'US$': 'usd', '€': 'eur', '£': 'gbp', '¥': 'jpy', 'ر.س': 'sar', 'د.إ': 'aed', 'د.ك': 'kwd' };
  var codes = GENEH_CCY.join('|');
  var re = new RegExp('^(?:(US\\$|\\$|€|£|¥|ر\\.س|د\\.إ|د\\.ك|' + codes + ')\\s*)?([0-9][0-9.,\\s]*)(?:\\s*(\\$|€|£|¥|ر\\.س|د\\.إ|د\\.ك|' + codes + '))?$', 'i');
  var m = s.match(re);
  if (!m) return null;
  var tag = m[1] || m[3];
  if (!tag) return null;
  var ccy = sym[tag] || sym[tag.toUpperCase()] || tag.toLowerCase();
  if (GENEH_CCY.indexOf(ccy) < 0) return null;
  var num = m[2].replace(/\s/g, '').replace(/[.,]$/, '');
  num = genehNormalizeNumber(num);
  var amount = parseFloat(num);
  return isFinite(amount) && amount > 0 ? { amount: amount, currency: ccy } : null;
}

/**
 * Every foreign amount in a run of page text, for "Show this page in EGP": [{ index, length, amount, currency }].
 * Same symbols, codes and number rule as genehFindAmount. Codes need a word edge, so "USDT" or "museum" never match.
 */
function genehFindAmounts(text) {
  var s = String(text == null ? '' : text);
  var out = [];
  if (!s || !/\d/.test(s)) return out;
  var sym = { '$': 'usd', 'US$': 'usd', '€': 'eur', '£': 'gbp', '¥': 'jpy', 'ر.س': 'sar', 'د.إ': 'aed', 'د.ك': 'kwd' };
  var codes = GENEH_CCY.join('|');
  var symbols = 'US\\$|\\$|€|£|¥|ر\\.س|د\\.إ|د\\.ك';
  var num = '\\d{1,3}(?:[.,\\u00a0\\u202f ]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?';
  var tagBefore = '(' + symbols + '|\\b(?:' + codes + ')\\b)[\\u00a0\\u202f ]?';
  var tagAfter = '[\\u00a0\\u202f ]?(' + symbols + '|\\b(?:' + codes + ')\\b)';
  var re = new RegExp(tagBefore + '(' + num + ')(?![\\d.,]*\\d)|(?:^|(?=[^\\d.,])|\\b)(' + num + ')' + tagAfter, 'gi');
  var m;
  while ((m = re.exec(s))) {
    var tag = m[1] || m[4];
    var raw = m[2] || m[3];
    var ccy = sym[tag] || sym[tag.toUpperCase()] || tag.toLowerCase();
    if (GENEH_CCY.indexOf(ccy) < 0) continue;
    var start = m.index + m[0].indexOf(m[1] ? m[1] : raw);
    if (start > 0 && /[\d.,]/.test(s[start - 1])) continue;
    var amount = parseFloat(genehNormalizeNumber(raw.replace(/[\u00a0\u202f ]/g, '')));
    if (!isFinite(amount) || amount <= 0) continue;
    out.push({ index: start, length: m.index + m[0].length - start, amount: amount, currency: ccy });
  }
  return out;
}

export { GENEH_FEED, GENEH_SOCIAL, GENEH_CCY, GENEH_CCY_NAMES, GENEH_GOLD, GENEH_SILVER, genehCurrency, genehGoldId, genehSilverId, genehBehind, genehBoard, genehMetal, genehSpot, genehEgpPer, genehConvert, genehBankNames, genehFmt, genehNormalizeNumber, genehFindAmount, genehFindAmounts };
