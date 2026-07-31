#!/usr/bin/env node
/**
 * Renders the menu bar usage rings into `assets/rings/`.
 *
 * The menu bar cannot use `getProgressIcon`, because it only resolves bundled icons and
 * asset filenames — inline `data:` SVG URIs render as nothing. Raycast's bundled
 * `CircleProgress` glyphs work but only come in quarter steps, so this pre-renders a
 * ring per `STEP` percent instead, giving the pill an accurate arc.
 *
 * Sizing is fiddly, so the constraints are worth recording:
 *   - SVG assets do not render in the menu bar at all, so these must be PNG.
 *   - Raycast does not resolve Apple's `@2x`/`@3x` suffixes; it loads the exact filename.
 *   - Raycast fits the image to the menu bar slot itself, which measures ~29 physical
 *     pixels on a 2x display. That is not an integer fraction of any sensible source
 *     size, so some resampling always happens and no "magic" size avoids it.
 * The fix is to supersample: render far larger than the slot so the downscale has enough
 * samples per output pixel to stay crisp. Sizes close to the target (18px, 36px, 54px)
 * are the worst case, because a near-1:1 fractional resample smears edges.
 *
 * Light and dark variants are emitted because macOS does not tint asset images in the
 * menu bar: the dark-appearance menu bar needs a white ring, the light one a black ring.
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

/** Logical size of the menu bar icon slot, in points. */
const VIEWBOX = 18;
/**
 * Supersampling factor. 8x (144px) is comfortably above every current backing scale, so
 * the downscale to the menu bar slot is a clean area average rather than a blur.
 */
const RENDER_SIZE = VIEWBOX * 8;

const RADIUS = 6.4;
const STROKE = 2.4;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Muted track per appearance, matching how Tailscale draws its dimmed menu bar dots.
 *
 * Tailscale ships a grayscale template image and lets macOS composite it, so its dimmed
 * grey is not a fixed hex value: it is the foreground colour at low alpha over whatever
 * sits behind the menu bar. Measured against a dark menu bar its dots land on
 * rgb(75, 76, 77), which white at 27% alpha reproduces exactly. Keeping the track
 * translucent rather than a solid `#4A4C4D` means it tracks the wallpaper the same way
 * Tailscale's does.
 */
const TRACK_OPACITY = 0.27;

function ringSvg(percent, colour, track) {
  const used = (percent / 100) * CIRCUMFERENCE;
  const trackCircle = `<circle cx="9" cy="9" r="${RADIUS}" fill="none" stroke="${track}" stroke-opacity="${TRACK_OPACITY}" stroke-width="${STROKE}" />`;
  // A full ring is drawn as a plain circle: a dasharray arc would leave a seam at 12 o'clock.
  const arc =
    percent >= 100
      ? `<circle cx="9" cy="9" r="${RADIUS}" fill="none" stroke="${colour}" stroke-width="${STROKE}" />`
      : percent > 0
        ? `<circle cx="9" cy="9" r="${RADIUS}" fill="none" stroke="${colour}" stroke-width="${STROKE}" stroke-linecap="round" stroke-dasharray="${used.toFixed(3)} ${CIRCUMFERENCE.toFixed(3)}" transform="rotate(-90 9 9)" />`
        : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEWBOX}" height="${VIEWBOX}" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}">${trackCircle}${arc}</svg>`;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const variants = [
  // The track reuses the foreground colour, exactly as a template image would.
  { suffix: "light", colour: "#000000", track: "#000000" },
  { suffix: "dark", colour: "#FFFFFF", track: "#FFFFFF" },
];

let count = 0;
for (let percent = 0; percent <= 100; percent += STEP) {
  for (const variant of variants) {
    const name = `ring-${String(percent).padStart(3, "0")}-${variant.suffix}`;
    const svgPath = join(tmpDir, `${name}.svg`);
    writeFileSync(svgPath, ringSvg(percent, variant.colour, variant.track));
    const args = ["-w", String(RENDER_SIZE), "-h", String(RENDER_SIZE), svgPath, "-o", join(outDir, `${name}.png`)];
    execFileSync("rsvg-convert", args);
    count += 1;
  }
}

console.log(`rendered ${count} ring assets into assets/rings (step ${STEP}%, ${RENDER_SIZE}px)`);
