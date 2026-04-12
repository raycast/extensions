#!/usr/bin/env node
/**
 * parse-moves.js
 *
 * Parses a PokéBase "Moves List – Pokémon Champions" HTML page
 * (as scraped from the browser) and merges any new moves into:
 *   - assets/moves.json   (Raycast extension data)
 *   - assets/raw.html     (static HTML table)
 *
 * Usage:
 *   node scripts/parse-moves.js "<path-to-scraped.html>"
 *
 * Safe to re-run: existing slugs are skipped (deduplication).
 */

const fs = require("fs");
const path = require("path");

// ─── Type → hex color (mirrors TYPE_COLORS in src/movelist.tsx) ────────────
const TYPE_COLORS = {
  Bug: "#90c12c",
  Dark: "#5a5465",
  Dragon: "#0f6ac0",
  Electric: "#f3d23b",
  Fairy: "#ef70ef",
  Fighting: "#d04164",
  Fire: "#fd7d24",
  Flying: "#748fc9",
  Ghost: "#556aae",
  Grass: "#63bb5b",
  Ground: "#dd7748",
  Ice: "#74cec0",
  Normal: "#9099a1",
  Poison: "#ab6ac8",
  Psychic: "#f366b9",
  Rock: "#c8b686",
  Steel: "#598fa3",
  Water: "#4592c4",
};

// ─── Paths ──────────────────────────────────────────────────────────────────
const PROJECT_ROOT = path.resolve(__dirname, "..");
const MOVES_JSON = path.join(PROJECT_ROOT, "assets", "moves.json");
const RAW_HTML = path.join(PROJECT_ROOT, "assets", "raw.html");

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Collapse runs of whitespace (including newlines) into a single space */
function normalizeWS(str) {
  return str.replace(/[\r\n\t ]+/g, " ").trim();
}

/**
 * Parse move rows out of a PokéBase scraped HTML string.
 *
 * The page uses a div-based CSS table where data rows all have class
 * "table-row odd:bg-zinc-50 dark:odd:bg-zinc-950". We split on that marker
 * and extract fields with targeted regexes on each row segment — no cell
 * boundary parsing needed.
 */
function parseMoves(html) {
  // Split on data-row markers (header row is class="table-row" only, no "odd:")
  const segments = html.split('<div class="table-row odd:');
  // segments[0] is everything before the first data row — skip it
  const moves = [];

  for (let i = 1; i < segments.length; i++) {
    const row = segments[i];

    // ── Type ─────────────────────────────────────────────────────────────────
    // First <img> in the name cell has alt="[Type]"
    const typeMatch = row.match(/<img\s[^>]*alt="([^"]+)"[^>]*>/);
    if (!typeMatch) continue;
    const type = typeMatch[1].trim();

    // ── Slug + Name ──────────────────────────────────────────────────────────
    // Handles both absolute (https://pokebase.app/…) and relative (/pokemon-champions/…) URLs
    const linkMatch = row.match(
      /href="(?:https:\/\/pokebase\.app)?\/pokemon-champions\/moves\/([^"]+)"[^>]*>([^<]+)<\/a>/
    );
    if (!linkMatch) continue;
    const slug = linkMatch[1].trim();
    const name = normalizeWS(linkMatch[2]);

    // ── Category ─────────────────────────────────────────────────────────────
    const catMatch = row.match(/aria-label="(Physical|Special|Status)"/);
    if (!catMatch) continue;
    const category = catMatch[1];

    // ── Description ──────────────────────────────────────────────────────────
    // Lives inside: <span class="inline-block max-w-md whitespace-pre-wrap align-top">…</span>
    const descMatch = row.match(/whitespace-pre-wrap align-top">([\s\S]*?)<\/span>/);
    const description = descMatch ? normalizeWS(descMatch[1]) : "";

    // ── Power / Accuracy / PP ────────────────────────────────────────────────
    // The last 3 cells have no nested tags: <span class="table-cell …">VALUE</span>
    const simpleSpans = [
      ...row.matchAll(/<span\s+class="table-cell align-middle text-sm p-2">([^<]*)<\/span>/g),
    ];

    if (simpleSpans.length < 3) continue;

    const power = simpleSpans[simpleSpans.length - 3][1].trim() || "-";
    const accuracy = simpleSpans[simpleSpans.length - 2][1].trim() || "-";
    const ppRaw = simpleSpans[simpleSpans.length - 1][1].trim();
    const pp = parseInt(ppRaw, 10) || 0;

    moves.push({ name, slug, type, category, description, power, accuracy, pp });
  }

  return moves;
}

/** Build a moves.json entry object */
function buildJsonEntry(move) {
  const typeLc = move.type.toLowerCase();
  const catLc = move.category.toLowerCase();
  return {
    name: move.name,
    slug: move.slug,
    type: move.type,
    type_icon: `img/type-${typeLc}.svg`,
    category: move.category,
    category_icon: `img/category-${catLc}.png`,
    description: move.description,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
  };
}

/** Build a raw.html <tr> row string */
function buildHtmlRow(move) {
  const typeLc = move.type.toLowerCase();
  const catLc = move.category.toLowerCase();
  const color = TYPE_COLORS[move.type] || "#999999";

  return `      <tr class="odd:bg-zinc-50 dark:odd:bg-zinc-950 border-b dark:border-zinc-800">
        <td class="p-2 align-middle text-sm">
          <div class="flex items-center gap-2">
            <img src="img/type-${typeLc}.svg" width="20" height="20" alt="${move.type}" title="${move.type}">
            <a class="font-semibold hover:underline decoration-zinc-400 underline-offset-2"
               href="https://pokebase.app/pokemon-champions/moves/${move.slug}">${move.name}</a>
          </div>
          <div class="flex items-center gap-1.5 mt-1">
            <img src="img/category-${catLc}.png" width="18" height="18" alt="${move.category}" title="${move.category}">
            <span class="text-xs font-medium px-1.5 py-0.5 rounded"
                  style="background:${color}22; color:${color}; border:1px solid ${color}55">${move.type}</span>
            <span class="text-xs text-zinc-500">${move.category}</span>
          </div>
        </td>
        <td class="p-2 align-top text-sm max-w-sm whitespace-pre-wrap">${move.description}</td>
        <td class="p-2 align-middle text-sm text-center font-mono">${move.power}</td>
        <td class="p-2 align-middle text-sm text-center font-mono">${move.accuracy}</td>
        <td class="p-2 align-middle text-sm text-center font-mono">${move.pp}</td>
      </tr>`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

const inputFile = process.argv[2];
if (!inputFile) {
  console.error("Usage: node scripts/parse-moves.js <path-to-scraped.html>");
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`File not found: ${inputFile}`);
  process.exit(1);
}

console.log(`\nReading: ${inputFile}`);
const html = fs.readFileSync(inputFile, "utf8");

// Parse all moves from the new HTML
const parsedMoves = parseMoves(html);
console.log(`Parsed ${parsedMoves.length} move rows from HTML`);

if (parsedMoves.length === 0) {
  console.error("ERROR: No moves parsed — check the HTML structure.");
  process.exit(1);
}

// Load existing moves.json
const existingMoves = JSON.parse(fs.readFileSync(MOVES_JSON, "utf8"));
const existingSlugs = new Set(existingMoves.map((m) => m.slug));
console.log(`Existing moves.json has ${existingMoves.length} entries`);

// Filter to only new moves
const newMoves = parsedMoves.filter((m) => !existingSlugs.has(m.slug));
console.log(`New moves to add: ${newMoves.length}`);

if (newMoves.length === 0) {
  console.log("Nothing to do — all moves already present.");
  process.exit(0);
}

// ── Update moves.json ────────────────────────────────────────────────────────
const updatedMoves = [...existingMoves, ...newMoves.map(buildJsonEntry)];
fs.writeFileSync(MOVES_JSON, JSON.stringify(updatedMoves, null, 2) + "\n", "utf8");
console.log(`\nmoves.json updated: ${existingMoves.length} → ${updatedMoves.length} entries`);

// ── Update raw.html ──────────────────────────────────────────────────────────
let rawHtml = fs.readFileSync(RAW_HTML, "utf8");

const newRows = newMoves.map(buildHtmlRow).join("\n");
if (!rawHtml.includes("</tbody>")) {
  console.error("ERROR: Could not find </tbody> in raw.html");
  process.exit(1);
}
rawHtml = rawHtml.replace("</tbody>", `${newRows}\n      </tbody>`);
fs.writeFileSync(RAW_HTML, rawHtml, "utf8");
console.log(`raw.html updated: ${newMoves.length} new rows inserted before </tbody>`);

// ── Summary ──────────────────────────────────────────────────────────────────
console.log("\n── New moves added ──────────────────────────────────────────");
newMoves.forEach((m, i) => {
  console.log(`  ${String(i + 1).padStart(3)}. ${m.name} (${m.type} / ${m.category})`);
});
console.log("\nDone ✓");
