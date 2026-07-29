#!/usr/bin/env node
/**
 * Renders the menu bar usage rings into `assets/rings/`.
 *
 * The menu bar cannot use `getProgressIcon`, because it only resolves bundled icons and
 * asset filenames — inline `data:` SVG URIs render as nothing. Raycast's bundled
 * `CircleProgress` glyphs work but only come in quarter steps, so this pre-renders a
 * ring per `STEP` percent instead, giving the pill an accurate arc.
 *
 * Light and dark variants are emitted because macOS does not tint asset images in the
 * menu bar: the dark-appearance menu bar needs a white ring, the light one a black ring.
 *
 * Requires `rsvg-convert` (brew install librsvg).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "assets", "rings");
const tmpDir = join(root, "node_modules", ".cache", "ring-svg");

/** Percentage granularity. 5 keeps the asset count reasonable while reading as smooth. */
const STEP = 5;
/** 18pt menu bar slot at 2x, with headroom for 3x displays. */
const SIZE = 54;

const VIEWBOX = 18;
const RADIUS = 6.4;
const STROKE = 2.4;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ringSvg(percent, colour) {
  const used = (percent / 100) * CIRCUMFERENCE;
  const track = `<circle cx="9" cy="9" r="${RADIUS}" fill="none" stroke="${colour}" stroke-opacity="0.35" stroke-width="${STROKE}" />`;
  // A full ring is drawn as a plain circle: a dasharray arc would leave a seam at 12 o'clock.
  const arc =
    percent >= 100
      ? `<circle cx="9" cy="9" r="${RADIUS}" fill="none" stroke="${colour}" stroke-width="${STROKE}" />`
      : percent > 0
        ? `<circle cx="9" cy="9" r="${RADIUS}" fill="none" stroke="${colour}" stroke-width="${STROKE}" stroke-linecap="round" stroke-dasharray="${used.toFixed(3)} ${CIRCUMFERENCE.toFixed(3)}" transform="rotate(-90 9 9)" />`
        : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEWBOX}" height="${VIEWBOX}" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}">${track}${arc}</svg>`;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const variants = [
  { suffix: "light", colour: "#000000" },
  { suffix: "dark", colour: "#FFFFFF" },
];

let count = 0;
for (let percent = 0; percent <= 100; percent += STEP) {
  for (const variant of variants) {
    const name = `ring-${String(percent).padStart(3, "0")}-${variant.suffix}`;
    const svgPath = join(tmpDir, `${name}.svg`);
    writeFileSync(svgPath, ringSvg(percent, variant.colour));
    execFileSync("rsvg-convert", ["-w", String(SIZE), "-h", String(SIZE), svgPath, "-o", join(outDir, `${name}.png`)]);
    count += 1;
  }
}

console.log(`rendered ${count} ring assets into assets/rings (step ${STEP}%)`);
