// Generates the committed Unicode data files consumed at runtime by the Unicode
// Browser command. Run manually (e.g. on a Unicode version bump):
//
//   node scripts/generate-unicode-data.mjs
//
// It downloads the official Unicode Character Database text files and emits two
// compact JSON files:
//   - src/lib/data/unicode-blocks.json  (small, imported eagerly)
//   - assets/unicode-names.json         (large, read lazily via fs at runtime)
//
// This script is NOT part of `ray build` and ships no runtime dependency — only
// its committed output is used by the extension.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "16.0.0";
const BASE = `https://www.unicode.org/Public/${VERSION}/ucd/`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "src", "lib", "data");
const ASSETS_DIR = join(ROOT, "assets");

async function fetchText(name) {
  const url = BASE + name;
  process.stdout.write(`Downloading ${url} … `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  console.log(`${(text.length / 1024).toFixed(0)} KB`);
  return text;
}

/** Parse DerivedAge.txt into sorted [start, end, age] intervals + a lookup. */
function parseAges(text) {
  const intervals = [];
  for (const line of text.split("\n")) {
    const body = line.split("#")[0].trim();
    if (!body) continue;
    const m = body.match(/^([0-9A-Fa-f]+)(?:\.\.([0-9A-Fa-f]+))?\s*;\s*([0-9.]+)/);
    if (!m) continue;
    const start = parseInt(m[1], 16);
    const end = m[2] ? parseInt(m[2], 16) : start;
    intervals.push([start, end, m[3]]);
  }
  intervals.sort((a, b) => a[0] - b[0]);

  const ageOf = (cp) => {
    let lo = 0;
    let hi = intervals.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const iv = intervals[mid];
      if (cp < iv[0]) hi = mid - 1;
      else if (cp > iv[1]) lo = mid + 1;
      else return iv[2];
    }
    return null;
  };
  return ageOf;
}

/** Parse Blocks.txt into [{ name, start, end }]. */
function parseBlocks(text) {
  const blocks = [];
  for (const line of text.split("\n")) {
    const body = line.split("#")[0].trim();
    if (!body) continue;
    const m = body.match(/^([0-9A-Fa-f]+)\.\.([0-9A-Fa-f]+)\s*;\s*(.+)$/);
    if (!m) continue;
    blocks.push({ name: m[3].trim(), start: parseInt(m[1], 16), end: parseInt(m[2], 16) });
  }
  blocks.sort((a, b) => a.start - b.start);
  return blocks;
}

/**
 * Parse UnicodeData.txt into the named characters and the algorithmic ranges.
 * Collapsed First/Last pairs (CJK, Hangul, Tangut, surrogates, private use …)
 * become ranges; controls borrow their Unicode 1.0 name; everything else is a
 * plain [cp, name, gc, age] row.
 */
function parseUnicodeData(text, ageOf) {
  const chars = [];
  const ranges = [];
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const f = line.split(";");
    const cp = parseInt(f[0], 16);
    const name = f[1];
    const gc = f[2];
    const unicode1 = f[10];

    const first = name.match(/^<(.+), First>$/);
    if (first) {
      const next = lines[i + 1].split(";");
      const end = parseInt(next[0], 16);
      ranges.push({ start: cp, end, label: first[1], gc, age: ageOf(cp) });
      i++; // consume the matching ", Last>" line
      continue;
    }

    if (name.startsWith("<")) {
      // <control> and similar — no formal name. Fall back to the Unicode 1.0
      // name (e.g. NULL, BELL) when present so controls stay searchable.
      if (unicode1) chars.push([cp, unicode1, gc, ageOf(cp)]);
      continue;
    }

    chars.push([cp, name, gc, ageOf(cp)]);
  }

  chars.sort((a, b) => a[0] - b[0]);
  ranges.sort((a, b) => a.start - b.start);
  return { chars, ranges };
}

async function main() {
  const [unicodeData, blocksTxt, agesTxt] = await Promise.all([
    fetchText("UnicodeData.txt"),
    fetchText("Blocks.txt"),
    fetchText("DerivedAge.txt"),
  ]);

  const ageOf = parseAges(agesTxt);
  const blocks = parseBlocks(blocksTxt);
  const { chars, ranges } = parseUnicodeData(unicodeData, ageOf);

  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(ASSETS_DIR, { recursive: true });

  const blocksFile = { unicodeVersion: VERSION, blocks, ranges };
  writeFileSync(join(DATA_DIR, "unicode-blocks.json"), JSON.stringify(blocksFile));

  const namesFile = { v: VERSION, chars };
  writeFileSync(join(ASSETS_DIR, "unicode-names.json"), JSON.stringify(namesFile));

  console.log(
    `\nWrote ${blocks.length} blocks, ${ranges.length} algorithmic ranges, ` +
      `${chars.length} named characters (Unicode ${VERSION}).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
