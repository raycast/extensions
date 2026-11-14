import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";
async function loadIconSvg(iconName) {
  const mod = await import(`lucide-static/dist/esm/icons/${iconName}.mjs`);
  return mod.default;
}

const OUT_DIR = resolve(process.cwd(), "assets");
const SIZE = 512;
// Shrink the glyph inside the 512x512 canvas. 1 => full size, 0.8 => 20% padding.
const SCALE = 0.8;
const COLOR_LIGHT = "#404040"; // Light theme base (on light backgrounds, black strokes)
const COLOR_DARK = "#ffffff"; // Dark theme variant (white strokes)

const selections = {
  "overview-icon.png": "square-kanban", // Overview
  "list-icon.png": "square-check-big", // My Tasks
  "create-icon.png": "plus", // Create Task
};

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

function wrapSvg(svg, color) {
  // Normalize fill/stroke and size; force stroke/fill to provided color
  return svg
    .replace('width="24"', 'width="24"')
    .replace('height="24"', 'height="24"')
    .replaceAll('stroke="currentColor"', `stroke="${color}"`)
    .replaceAll('fill="currentColor"', `fill="${color}"`);
}

async function svgToPng(svg, outPath, color) {
  const wrapped = wrapSvg(svg, color);
  const buf = Buffer.from(wrapped, "utf8");
  const image = sharp(buf, { density: 288 });
  const glyphSize = Math.max(1, Math.round(SIZE * SCALE));
  const padTotal = SIZE - glyphSize;
  const padLeft = Math.floor(padTotal / 2);
  const padRight = padTotal - padLeft;
  const padTop = padLeft;
  const padBottom = padRight;
  const png = await image
    .resize(glyphSize, glyphSize, { fit: "contain" })
    .extend({
      top: padTop,
      bottom: padBottom,
      left: padLeft,
      right: padRight,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(outPath, png);
}

async function main() {
  await ensureDir(OUT_DIR);

  const tasks = Object.entries(selections).flatMap(([filename, iconName]) => {
    return [
      (async () => {
        const svg = await loadIconSvg(iconName);
        const out = resolve(OUT_DIR, filename);
        await ensureDir(dirname(out));
        await svgToPng(svg, out, COLOR_LIGHT);
        console.log(`Wrote ${out}`);
      })(),
      (async () => {
        const svg = await loadIconSvg(iconName);
        const extIdx = filename.lastIndexOf(".");
        const darkFilename =
          extIdx > 0 ? `${filename.slice(0, extIdx)}@dark${filename.slice(extIdx)}` : `${filename}@dark`;
        const out = resolve(OUT_DIR, darkFilename);
        await ensureDir(dirname(out));
        await svgToPng(svg, out, COLOR_DARK);
        console.log(`Wrote ${out}`);
      })(),
    ];
  });

  await Promise.all(tasks);

  // Files are generated into assets/. Raycast resolves bare filenames to assets/ automatically.
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
