// One-shot generator: produces path-data for A-Z baked from Roboto Bold.
// Output goes to stdout as a JSON map { "A": "M...Z", ..., "Z": "M...Z" }.
//
// The resulting paths are pasted into src/priority.ts as the LETTER_PATHS
// const so the menu-bar (NSImage SVG, no font loading) can still render
// the priority letter inside the squircle.
//
// Roboto Bold is Apache 2.0 (license-compatible with this MIT project).

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const FONT_PATH = path.join(
  ROOT,
  "node_modules/@fontsource/roboto/files/roboto-latin-700-normal.woff",
);

// 11px at a 16-unit viewBox matches what the previous <text> element used
// (font-size="11", viewBox 0 0 16 16, centered at 8,8).
const TARGET_SIZE = 11;
const VIEWBOX = 16;

const buf = readFileSync(FONT_PATH);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const font = opentype.parse(ab);

const result = {};

for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
  // Probe at (0,0) to get the natural bbox, then translate so the glyph
  // is centered both horizontally and vertically in the 16x16 viewBox.
  const probe = font.getPath(letter, 0, 0, TARGET_SIZE);
  const bbox = probe.getBoundingBox();
  const w = bbox.x2 - bbox.x1;
  const h = bbox.y2 - bbox.y1;
  const xOffset = (VIEWBOX - w) / 2 - bbox.x1;
  const yOffset = (VIEWBOX - h) / 2 - bbox.y1;
  const placed = font.getPath(letter, xOffset, yOffset, TARGET_SIZE);
  result[letter] = placed.toPathData(2);
}

console.log(JSON.stringify(result, null, 2));
