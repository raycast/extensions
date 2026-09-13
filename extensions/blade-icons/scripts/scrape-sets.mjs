#!/usr/bin/env node
/**
 * One-time scraper that builds src/sets.json from blade-ui-kit.com.
 * Re-run whenever new icon sets are added to the site:
 *   node scripts/scrape-sets.mjs
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = "https://blade-ui-kit.com/blade-icons";
const UA = { "User-Agent": "Mozilla/5.0 (raycast-blade-icons scraper)" };

async function fetchText(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

function decode(html) {
  return html
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&amp;", "&");
}

// 1. Discover all sets from the dropdown
const indexHtml = await fetchText(BASE);
const sets = [...indexHtml.matchAll(/<option wire:key="set_(\d+)" value="\d+"\s*[^>]*>\s*([^<]+?)\s*</g)].map((m) => ({
  id: Number(m[1]),
  name: m[2],
}));
console.log(`Found ${sets.length} icon sets`);

// Style detection — keep in sync with detectStyle() in src/search.tsx
const OUTLINE_TOKENS = new Set(["outline", "outlined", "linear", "line", "broken", "thin", "light", "regular", "o"]);
const SOLID_TOKENS = new Set(["fill", "filled", "solid", "bold", "duotone", "s", "f"]);
const FILL_PAIRED_PREFIXES = new Set(["bi", "phosphor"]);
const OUTLINE_ONLY_PREFIXES = new Set(["bx"]);
const MONO_PAINTS = new Set(["none", "currentcolor", "transparent", "inherit", "white", "black", "#fff", "#ffffff", "#000", "#000000"]);

function detectStyle(name, svg) {
  const visible = svg.replace(/<defs>[\s\S]*?<\/defs>/gi, "").replace(/\s*clip-path="[^"]*"/gi, "");
  const paints = [
    ...[...visible.matchAll(/(?:fill|stroke)="([^"]+)"/gi)].map((m) => m[1]),
    ...[...visible.matchAll(/(?:fill|stroke)\s*:\s*([^;"'}]+)/gi)].map((m) => m[1]),
  ].map((v) => v.trim().toLowerCase());
  if (paints.some((v) => !MONO_PAINTS.has(v))) return "color";
  const tokens = name.split("-");
  if (OUTLINE_ONLY_PREFIXES.has(tokens[0])) return "outline";
  if (FILL_PAIRED_PREFIXES.has(tokens[0])) return tokens.some((t) => SOLID_TOKENS.has(t)) ? "solid" : "outline";
  if (tokens.some((token) => OUTLINE_TOKENS.has(token))) return "outline";
  if (tokens.some((token) => SOLID_TOKENS.has(token))) return "solid";
  if (svg.includes('fill="none"') || /stroke="currentColor"/.test(svg)) return "outline";
  return "solid";
}

// 2. Per set: count (from placeholder), prefix + styles (from sampled icons),
//    composer package (from first icon's detail page)
async function scrapeSet(set) {
  const html = await fetchText(`${BASE}?selectedSet=${set.id}`);

  const countMatch = html.match(/placeholder="Search all ([\d,.]+) Blade icons/);
  const count = countMatch ? Number(countMatch[1].replace(/[,.]/g, "")) : null;

  const samples = html
    .split(/wire:key="result_\d+"/)
    .slice(1)
    .map((block) =>
      block.match(/href="https:\/\/blade-ui-kit\.com\/blade-icons\/([a-z0-9-]+)"[\s\S]*?(<svg[\s\S]*?<\/svg>)/),
    )
    .filter(Boolean)
    .map((m) => ({ name: m[1], svg: m[2] }));
  const icons = samples.map((s) => s.name);
  if (icons.length === 0) throw new Error(`no icons for set ${set.name}`);

  const styles = [...new Set(samples.map((s) => detectStyle(s.name, s.svg)))].sort();

  // prefix = leading dash-separated token(s) shared by every icon in the set
  const segments = icons[0].split("-");
  let prefix = "";
  for (let n = 1; n < segments.length; n++) {
    const candidate = segments.slice(0, n).join("-");
    if (icons.every((i) => i.startsWith(candidate + "-"))) prefix = candidate;
    else break;
  }
  if (!prefix) throw new Error(`no common prefix for set ${set.name} (${icons[0]})`);

  const detailHtml = await fetchText(`${BASE}/${icons[0]}`);
  const pkgMatch = detailHtml.match(/composer require ([a-z0-9_.\/-]+)/i);
  // The set name in the detail-page heading links to the set's GitHub repo
  const repoMatch = detailHtml.match(/class="text-scarlet-600 hover:text-scarlet-500" href="(https:\/\/github\.com\/[^"]+)"/);
  const github = repoMatch ? repoMatch[1] : pkgMatch ? `https://github.com/${pkgMatch[1]}` : null;

  return { ...set, count, prefix, package: pkgMatch ? pkgMatch[1] : null, styles, github };
}

const results = [];
const queue = [...sets];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const set = queue.shift();
      try {
        const r = await scrapeSet(set);
        results.push(r);
        console.log(`${r.name}: count=${r.count} prefix=${r.prefix} package=${r.package}`);
      } catch (e) {
        console.error(`FAILED ${set.name}: ${e.message}`);
        results.push({ ...set, count: null, prefix: null, package: null });
      }
    }
  }),
);

results.sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "sets.json");
writeFileSync(out, JSON.stringify(results, null, 2) + "\n");
console.log(`Wrote ${results.length} sets to ${out}`);
