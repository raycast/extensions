#!/usr/bin/env node
/**
 * Renders the editable SVGs in `icon-sources/` into the 512x512 PNGs Raycast expects
 * in `assets/`. Requires `rsvg-convert` (brew install librsvg).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "icon-sources");
const outDir = join(root, "assets");
const SIZE = 512;

mkdirSync(outDir, { recursive: true });

const sources = readdirSync(sourceDir).filter((file) => file.endsWith(".svg"));
if (sources.length === 0) {
  console.error(`No SVG sources found in ${sourceDir}`);
  process.exit(1);
}

for (const file of sources) {
  const out = join(outDir, file.replace(/\.svg$/, ".png"));
  execFileSync("rsvg-convert", ["-w", String(SIZE), "-h", String(SIZE), join(sourceDir, file), "-o", out]);
  console.log(`rendered ${file} -> assets/${file.replace(/\.svg$/, ".png")}`);
}
