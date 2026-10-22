// Attribution and licensing pre-flight. Runs before `npm run publish`; a
// failure here stops the publish.
//
// WHY IT EXISTS: the per-product history in memradar.com's JSON is Keepa data,
// published under a written consent (2026-09-20) whose approved scope is "a
// public downsampled JSON file (one data point per month) for use with your
// extension" and nothing wider. See the Data licensing section in the memradar
// repo's CLAUDE.md. That boundary has to be CHECKED before each publish rather
// than remembered, because the thing most likely to breach it is a change
// nobody thought was about licensing.
//
// Checks:
//   1. Both live files carry a non-empty `attribution`, and the PER-PRODUCT
//      file's does not invite republication: consent covers monthly points for
//      use with this extension, not onward redistribution, and an invitation
//      reads as purporting to grant a sublicense (Section 18(7)(c)). The market
//      file may invite it: those are MemRadar's own aggregate medians.
//   2. No UI source hardcodes attribution text; it must be read from the
//      payload, so the wording cannot drift out of compliance.
//   3. The README credits Keepa and states the monthly granularity.
//   4. Every history entry is EXACTLY one point per month: well-formed YYYY-MM
//      keys, no month twice, chronological.
//
// Usage:
//   node scripts/preflight-attribution.mjs
//   node scripts/preflight-attribution.mjs --products=./some/local.json   (for testing this script)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MARKET_URL = "https://memradar.com/data/raycast-v1-market.json";
const PRODUCTS_URL = "https://memradar.com/data/raycast-v1-products.json";
// 01 to 12, not any two digits: "2026-13" is not a month, and this check is
// the licensing boundary rather than a formatting preference.
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const failures = [];
const fail = (msg) => failures.push(msg);
const ok = (msg) => console.log(`  ok    ${msg}`);

async function load(url, override, label) {
  if (override) {
    console.log(`  note  ${label} read from local override: ${override}`);
    return JSON.parse(readFileSync(override, "utf8"));
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "memradar-raycast-preflight (+https://memradar.com)" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status} from ${url}`);
  return res.json();
}

// Any file under src/ that mentions Keepa, or repeats a distinctive phrase from
// the payload's own attribution, is hardcoding what it should be rendering.
function scanSources(attribution) {
  // Both spellings on purpose: this list is looking for hardcoded credit text,
  // and a British-spelled literal is just as hardcoded as an American one.
  const phrases = ["Keepa", "under licence", "under license", "with Keepa's written permission"];
  const hits = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx)$/.test(e)) continue;
      const text = readFileSync(p, "utf8");
      for (const phrase of phrases) {
        if (text.includes(phrase)) hits.push(`${p.replace(ROOT + "/", "")} contains "${phrase}"`);
      }
      // A long literal lifted from the payload is the same mistake in another shape.
      const chunk = attribution.slice(0, 40);
      if (chunk && text.includes(chunk)) hits.push(`${p.replace(ROOT + "/", "")} embeds the payload's attribution text`);
    }
  };
  walk(join(ROOT, "src"));
  return [...new Set(hits)];
}

function checkMonthly(products) {
  const problems = [];
  let points = 0;
  for (const p of products) {
    const history = p.history_monthly;
    if (!history) continue;
    const months = history.map((entry) => entry?.[0]);
    points += months.length;
    for (const m of months) {
      if (typeof m !== "string" || !MONTH_KEY.test(String(m))) {
        problems.push(`${p.sku}: "${m}" is not a YYYY-MM month key`);
      }
    }
    if (new Set(months).size !== months.length) problems.push(`${p.sku}: more than one point in the same month`);
    const sorted = [...months].sort();
    if (months.join() !== sorted.join()) problems.push(`${p.sku}: months are not in chronological order`);
  }
  return { problems, points };
}

const [market, products] = await Promise.all([
  load(MARKET_URL, arg("market"), "market"),
  load(PRODUCTS_URL, arg("products"), "products"),
]);

console.log("\nAttribution and licensing pre-flight\n");

// 1. Attribution present in both payloads.
for (const [label, payload] of [
  ["market", market],
  ["products", products],
]) {
  const a = payload.attribution;
  if (typeof a !== "string" || a.trim() === "") fail(`${label} payload has no non-empty "attribution" field`);
  else if (!a.includes("Keepa")) fail(`${label} payload attribution does not name Keepa`);
  else ok(`${label} payload carries attribution (${a.length} chars, names Keepa)`);
}

// 1b. The per-product file must not invite republication of the history.
const productAttribution = typeof products.attribution === "string" ? products.attribution : "";
if (/republish|redistribut(e|ion) (is )?(allowed|permitted)|free to share/i.test(productAttribution)) {
  fail('products payload attribution invites republication ("republish"), which the license does not grant');
} else {
  ok("products payload attribution does not invite republication");
}

// 2. Nothing hardcoded in the UI.
const hardcoded = scanSources(products.attribution ?? "");
if (hardcoded.length) hardcoded.forEach((h) => fail(`attribution is hardcoded in source: ${h}`));
else ok("no attribution text hardcoded in src/ (the UI renders the payload's own field)");

// 3. README credit.
let readme = "";
try {
  readme = readFileSync(join(ROOT, "README.md"), "utf8");
} catch {
  fail("README.md is missing");
}
if (readme) {
  if (!readme.includes("Keepa")) fail("README.md does not credit Keepa");
  else if (!/one point per month|one data point per month|monthly/i.test(readme))
    fail("README.md does not state the monthly granularity");
  else ok("README.md credits Keepa and states the monthly granularity");
}

// 4. The licensing boundary itself.
const { problems, points } = checkMonthly(products.products ?? []);
if (problems.length) {
  problems.slice(0, 5).forEach((p) => fail(`history is not monthly: ${p}`));
  if (problems.length > 5) fail(`...and ${problems.length - 5} more non-monthly history problems`);
} else {
  ok(`history is exactly monthly (${points} points across ${products.products?.length ?? 0} products)`);
}

console.log("");
if (failures.length) {
  console.error("PRE-FLIGHT FAILED. Publishing would breach the terms this data is published under.\n");
  failures.forEach((f) => console.error(`  FAIL  ${f}`));
  console.error("\nSee the Data licensing section in the memradar repo's CLAUDE.md before changing anything here.\n");
  process.exit(1);
}
console.log("PRE-FLIGHT PASSED. Safe to publish.\n");
