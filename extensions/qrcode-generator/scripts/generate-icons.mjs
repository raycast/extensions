// One-off generator for the three distinct command icons, built from Lucide glyphs (ISC licensed).
// Run with: npm install --no-save sharp lucide-static && node scripts/generate-icons.mjs
// Produces 512x512 PNGs in ../assets.
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(here, "..", "assets");
const lucideDir = join(here, "..", "node_modules", "lucide-static", "icons");

// Distinct color + glyph per command. At small list sizes color is the primary
// differentiator, so each command gets its own vibrant background plus a bold white glyph.
const icons = {
  "generate-qr-icon.png": { glyph: "qr-code", bg: "#ED4949" }, // red (matches the published icon)
  "clipboard-icon.png": { glyph: "clipboard-copy", bg: "#059669" }, // emerald
  "selection-icon.png": { glyph: "text-cursor", bg: "#7C3AED" }, // violet
};

const FG = "#FFFFFF"; // glyph stroke

// Pull the inner shapes out of a Lucide SVG (attributes never contain ">", so the first ">" closes the tag).
function lucideInner(name) {
  const svg = readFileSync(join(lucideDir, `${name}.svg`), "utf-8");
  return svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>[\s\S]*$/, "")
    .trim();
}

const GLYPH = 320; // larger glyph = more legible when shrunk to ~32px
const scale = GLYPH / 24; // Lucide icons use a 24x24 viewBox
const offset = (512 - GLYPH) / 2;
const STROKE = 2.4; // bolder than Lucide's default 2 so detail survives at small sizes

for (const [file, { glyph, bg }] of Object.entries(icons)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="112" fill="${bg}"/>
    <g transform="translate(${offset} ${offset}) scale(${scale})"
       fill="none" stroke="${FG}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">
      ${lucideInner(glyph)}
    </g>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(assetsDir, file));
  console.log("wrote", file, "from lucide:", glyph, "on", bg);
}
