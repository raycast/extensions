#!/usr/bin/env node
/**
 * Regenerates `src/data/mcc.json` from the MIT-licensed Merchant Category Codes dataset
 * (https://github.com/Oleksios/Merchant-Category-Codes).
 *
 * Usage: node scripts/update-mcc.mjs
 *
 * Output: { groups: { [type]: { en, uk } }, codes: { [mcc]: [groupType, en, uk] } }.
 * MCC keys have no leading zeros, to match the numbers the monobank API returns.
 */
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL = "https://raw.githubusercontent.com/Oleksios/Merchant-Category-Codes/HEAD/With%20groups/mcc.json";
const OUTPUT_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "mcc.json");

// Cyrillic letters that look like Latin ones. Some English names in the dataset contain them
// (e.g. "Сashier's office"), which breaks search and looks odd in some fonts.
const LOOKALIKES = {
  А: "A",
  В: "B",
  С: "C",
  Е: "E",
  Н: "H",
  І: "I",
  К: "K",
  М: "M",
  О: "O",
  Р: "P",
  Т: "T",
  Х: "X",
  а: "a",
  с: "c",
  е: "e",
  і: "i",
  о: "o",
  р: "p",
  х: "x",
  у: "y",
};

function toLatin(text) {
  return text.replace(/[\u0400-\u04FF]/g, (letter) => LOOKALIKES[letter] ?? letter);
}

const response = await fetch(SOURCE_URL);
if (!response.ok) {
  throw new Error(`Failed to download ${SOURCE_URL}: ${response.status}`);
}

const items = await response.json();
const groups = {};
const codes = {};
let fixed = 0;

for (const item of items) {
  const { type, description } = item.group;
  groups[type] ??= { en: toLatin(description.en), uk: description.uk };

  const en = toLatin(item.shortDescription.en);
  if (en !== item.shortDescription.en) fixed++;
  codes[String(Number(item.mcc))] = [type, en, item.shortDescription.uk];
}

const leftover = [
  ...Object.values(groups).map((group) => group.en),
  ...Object.values(codes).map((code) => code[1]),
].filter((text) => /[\u0400-\u04FF]/.test(text));
if (leftover.length) {
  throw new Error(`English names still contain Cyrillic letters: ${leftover.join(", ")}`);
}

// One entry per line, laid out as Prettier formats it, so updates produce readable diffs.
const formatValue = (value) =>
  Array.isArray(value)
    ? `[${value.map((item) => JSON.stringify(item)).join(", ")}]`
    : `{ ${Object.entries(value)
        .map(([key, item]) => `${JSON.stringify(key)}: ${JSON.stringify(item)}`)
        .join(", ")} }`;
const formatBlock = (name, entries) =>
  [
    `  ${JSON.stringify(name)}: {`,
    Object.entries(entries)
      .map(([key, value]) => `    ${JSON.stringify(key)}: ${formatValue(value)}`)
      .join(",\n"),
    "  }",
  ].join("\n");
const json = `{\n${formatBlock("groups", groups)},\n${formatBlock("codes", codes)}\n}`;
await writeFile(OUTPUT_PATH, json + "\n");
console.log(
  `Wrote ${Object.keys(codes).length} codes in ${Object.keys(groups).length} groups to ${OUTPUT_PATH} ` +
    `(${fixed} English names fixed)`,
);
