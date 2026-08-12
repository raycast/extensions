// Regenerates src/data/emoji.json. Run with: node tools/build-emoji-data.mjs
//
// Source: @emoji-mart/data's native set — the same data Karakeep's own web app
// searches, so a word that finds an emoji there finds it here too.
//
// We fetch ONE file (sets/15/native.json, ~430 KB) rather than depending on the
// package, which unpacks to 28 MB because it ships every set and version. From
// that we keep only character, name and keywords, which is ~95 KB.
//
// Keywords matter more than they look: CLDR's annotations describe what an
// emoji DEPICTS ("grin", "face"), while emoji-mart's describe what people MEAN
// by it ("happy", "joy") — and "happy" is the first thing anyone types.
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "https://unpkg.com/@emoji-mart/data/sets/15/native.json";

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`${SOURCE} → HTTP ${response.status}`);
const data = await response.json();

const emoji = Object.values(data.emojis).map((entry) => {
  // Drop keywords already contained in the name — they cost bytes and match
  // nothing the name wouldn't have matched anyway.
  const nameWords = new Set(entry.name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const keywords = (entry.keywords ?? []).filter((k) => !nameWords.has(k.toLowerCase()));

  // Order is preserved: emoji-mart lists the canonical emoji before its
  // variants, and search uses the index as a final tie-break.
  return keywords.length ? [entry.skins[0].native, entry.name, keywords.join(" ")] : [entry.skins[0].native, entry.name];
});

const out = join(import.meta.dirname, "../src/data/emoji.json");
writeFileSync(out, JSON.stringify(emoji));
console.log(`${emoji.length} emoji → ${out}`);
