#!/usr/bin/env node
/**
 * Render artwork/extension-icon.svg to the 512x512 PNG the Store requires.
 *
 * The SVG is the source of truth and is committed alongside the PNG so the mark
 * stays editable.
 *
 * sharp is deliberately NOT a dependency of this project: it carries libvips
 * CVEs and exists here to render one file that changes almost never. Install it
 * for the duration instead:
 *
 *     npm install --no-save sharp
 *     npm run icon
 */

import { readFileSync, writeFileSync } from "node:fs";

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("\n  sharp is not installed. Run `npm install --no-save sharp`, then `npm run icon` again.\n");
  process.exitCode = 1;
}

const SOURCE = "artwork/extension-icon.svg";
const OUTPUT = "assets/extension-icon.png";
const SIZE = 512;

if (!sharp) process.exit();

const svg = readFileSync(SOURCE);
const png = await sharp(svg, { density: 384 }).resize(SIZE, SIZE, { fit: "contain" }).png({ compressionLevel: 9 }).toBuffer();

writeFileSync(OUTPUT, png);

const { width, height } = await sharp(png).metadata();
console.log(`${OUTPUT}: ${width}x${height}, ${(png.length / 1024).toFixed(1)} kB`);
