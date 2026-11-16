// Builds assets/data/pinyin-index.json from the Unicode Unihan database.
//
// Usage:
//   curl -LO https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
//   unzip Unihan.zip -d unihan
//   node scripts/build-pinyin-index.mjs unihan
//
// Characters included: the 8105 characters of the Table of General Standard Chinese
// Characters (kTGH), plus any other character with Hanyu Pinlu frequency data (kHanyuPinlu)
// that is not just the traditional form of a simplified character (those are shown
// alongside their simplified form instead).
// Each entry is [character, readings, definition, traditional, standardIndex], where
// readings is a list of [tone-marked pinyin, frequency count] pairs (count is 0 when
// Hanyu Pinlu has no data for that reading). Entries are sorted most common first.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const unihanDir = process.argv[2];
if (!unihanDir) {
  console.error("Usage: node scripts/build-pinyin-index.mjs <path-to-extracted-Unihan>");
  process.exit(1);
}

const outFile = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "data", "pinyin-index.json");

const fields = new Map(); // field -> Map(char -> value)
const wanted = new Set([
  "kTGH",
  "kTGHZ2013",
  "kHanyuPinlu",
  "kMandarin",
  "kDefinition",
  "kTraditionalVariant",
  "kSimplifiedVariant",
]);

for (const file of ["Unihan_Readings.txt", "Unihan_OtherMappings.txt", "Unihan_Variants.txt"]) {
  for (const line of readFileSync(join(unihanDir, file), "utf8").split("\n")) {
    if (!line.startsWith("U+")) continue;
    const [code, field, value] = line.split("\t");
    if (!wanted.has(field)) continue;
    if (!fields.has(field)) fields.set(field, new Map());
    fields.get(field).set(String.fromCodePoint(parseInt(code.slice(2), 16)), value);
  }
}

const get = (field, char) => fields.get(field).get(char);
const codeToChar = (code) => String.fromCodePoint(parseInt(code.slice(2), 16));

const standardIndex = new Map();
for (const [char, value] of fields.get("kTGH")) {
  const match = /^2013:(\d+)$/.exec(value);
  if (match) standardIndex.set(char, Number(match[1]));
}

const isTraditionalForm = (char) =>
  (get("kSimplifiedVariant", char) ?? "")
    .split(" ")
    .filter(Boolean)
    .some((code) => codeToChar(code) !== char);

const chars = new Set([
  ...standardIndex.keys(),
  ...[...fields.get("kHanyuPinlu").keys()].filter((char) => !isTraditionalForm(char)),
]);

const cleanDefinition = (text) => (text ?? "").replace(/U\+[0-9A-F]{4,5}/g, (code) => codeToChar(code)).trim();

const entries = [];
for (const char of chars) {
  const readings = new Map(); // pinyin -> count

  for (const item of (get("kHanyuPinlu", char) ?? "").split(" ").filter(Boolean)) {
    const match = /^(.+)\((\d+)\)$/.exec(item);
    if (match) readings.set(match[1], (readings.get(match[1]) ?? 0) + Number(match[2]));
  }
  for (const item of (get("kTGHZ2013", char) ?? "").split(" ").filter(Boolean)) {
    const pinyin = item.split(":")[1];
    if (pinyin && !readings.has(pinyin)) readings.set(pinyin, 0);
  }
  for (const pinyin of (get("kMandarin", char) ?? "").split(" ").filter(Boolean)) {
    if (!readings.has(pinyin)) readings.set(pinyin, 0);
  }
  if (readings.size === 0) continue;

  const traditional = (get("kTraditionalVariant", char) ?? "")
    .split(" ")
    .filter(Boolean)
    .map(codeToChar)
    .filter((variant) => variant !== char);

  let definition = cleanDefinition(get("kDefinition", char));
  if (!definition) {
    const fromVariant = traditional.map((variant) => get("kDefinition", variant)).find(Boolean);
    definition = cleanDefinition(fromVariant);
  }

  entries.push([
    char,
    [...readings].sort((a, b) => b[1] - a[1]),
    definition,
    traditional.join("/"),
    standardIndex.get(char) ?? 0,
  ]);
}

const totalCount = (entry) => entry[1].reduce((sum, [, count]) => sum + count, 0);
const rank = (index) => (index === 0 ? Infinity : index);
entries.sort((a, b) => totalCount(b) - totalCount(a) || rank(a[4]) - rank(b[4]));

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(entries));

const withoutDefinition = entries.filter((entry) => !entry[2]).length;
console.log(`Wrote ${entries.length} characters to ${outFile} (${withoutDefinition} without a definition)`);
