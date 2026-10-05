// Regenerates assets/symbols/data.json from the system's authoritative SF Symbols
// data (CoreGlyphs.bundle), merging in glyph characters from the previous dataset
// and from the MoOx/sf-symbols-svg release metadata (Apple's official per-release
// name/character lists, MIT).
//
// Run after an OS / SF Symbols update to refresh the bundled baseline:
//   node scripts/generate-catalog.mjs
//
// The extension also refreshes names and characters on users' machines at runtime
// (see src/catalog.ts); this baseline is the offline/first-launch fallback.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const RES = "/System/Library/CoreServices/CoreGlyphs.bundle/Contents/Resources";
const GLYPH_SOURCE_REPO = "MoOx/sf-symbols-svg";

const plist = (file) => JSON.parse(execSync(`plutil -convert json -o - "${RES}/${file}"`, { maxBuffer: 1 << 26 }));

const availability = plist("name_availability.plist"); // { symbols: {name: year}, year_to_release: {year: {iOS,...}} }
const search = plist("symbol_search.plist"); // { name: [terms] }
const categories = plist("symbol_categories.plist"); // { name: [categoryKeys] }
const aliases = plist("name_aliases.strings"); // { legacyName: currentName }

// A plausible glyph char is a single code point in or above the private-use planes.
const isGlyphChar = (char) => [...char].length === 1 && char.codePointAt(0) >= 0x2000;

/**
 * Fetch Apple's official name->char lists (as republished per release by
 * MoOx/sf-symbols-svg) for the two newest releases. Two, because a beta can
 * rename symbols that the installed macOS still uses the older name for.
 * Returns a merged {name: char} map (newest release wins); empty map offline.
 */
async function fetchReleaseGlyphs() {
  const get = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.text();
  };
  try {
    const listing = JSON.parse(await get(`https://api.github.com/repos/${GLYPH_SOURCE_REPO}/contents/sources`));
    const versions = listing
      .filter((entry) => entry.type === "dir")
      .map((entry) => entry.name)
      .sort((a, b) => parseFloat(a) - parseFloat(b))
      .slice(-2);

    const merged = new Map();
    for (const version of versions) {
      const base = `https://raw.githubusercontent.com/${GLYPH_SOURCE_REPO}/main/sources/${version}`;
      const lines = (text) => text.split("\n").filter((l) => l.trim() && !l.startsWith("//"));
      const names = lines(await get(`${base}/names.txt`)).map((l) => l.trim());
      // The chars come as one or more lines of consecutive glyphs; split code-point-wise.
      const chars = [...lines(await get(`${base}/symbols.txt`)).join("")];
      if (names.length !== chars.length) {
        console.warn(`Skipping release ${version}: ${names.length} names vs ${chars.length} chars`);
        continue;
      }
      for (let i = 0; i < names.length; i++) if (isGlyphChar(chars[i])) merged.set(names[i], chars[i]);
      console.log(`Fetched release ${version}: ${names.length} name→char pairs`);
    }
    return merged;
  } catch (error) {
    console.warn(`Glyph fetch failed (offline?): ${error.message} — continuing with carried-over glyphs.`);
    return new Map();
  }
}

// Carry glyph characters over from the existing dataset.
const prevGlyphs = new Map();
try {
  const prev = JSON.parse(readFileSync(join(root, "assets/symbols/data.json"), "utf8"));
  for (const s of prev.symbols) if (s.symbol) prevGlyphs.set(s.name, s.symbol);
} catch {
  // first run / no previous dataset — proceed without glyphs
}

const fetchedGlyphs = await fetchReleaseGlyphs();
let mismatches = 0;
for (const [name, char] of fetchedGlyphs) {
  if (prevGlyphs.has(name) && prevGlyphs.get(name) !== char) mismatches++;
  prevGlyphs.set(name, char); // Apple's release metadata wins over carried-over data
}
if (mismatches) console.warn(`${mismatches} carried-over glyphs disagreed with the release metadata and were replaced.`);

// Renamed symbols keep their glyph character; resolve through the alias table in
// both directions so old and new names share whichever glyph is known.
for (const [legacy, current] of Object.entries(aliases)) {
  const glyph = prevGlyphs.get(current) ?? prevGlyphs.get(legacy);
  if (!glyph) continue;
  if (!prevGlyphs.has(current)) prevGlyphs.set(current, glyph);
  if (!prevGlyphs.has(legacy)) prevGlyphs.set(legacy, glyph);
}

const names = Object.keys(availability.symbols).sort();
let withGlyph = 0;
const symbols = names.map((name) => {
  const symbol = prevGlyphs.get(name) ?? "";
  if (symbol) withGlyph++;
  return {
    name,
    symbol,
    categories: categories[name] ?? [],
    searchTerms: search[name] ?? [],
    availableFrom: String(availability.symbols[name]),
    restriction: null,
  };
});

const versions = {};
for (const [year, os] of Object.entries(availability.year_to_release)) versions[year] = os;

const out = { symbols, categories: [], versions };
writeFileSync(join(root, "assets/symbols/data.json"), JSON.stringify(out));
console.log(`Wrote ${symbols.length} symbols (${withGlyph} with glyph, ${symbols.length - withGlyph} without), ${Object.keys(versions).length} version entries.`);
