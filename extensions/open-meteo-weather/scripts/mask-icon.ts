// Applies a rounded-rect alpha mask (Raycast icon style) to a square PNG,
// making the corners truly transparent. qlmanage composites SVGs onto opaque
// white, so this runs as a post-process after rasterizing.
//   npx tsx scripts/mask-icon.ts <in.png> <out.png>
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("usage: tsx scripts/mask-icon.ts <in.png> <out.png>");
  process.exit(1);
}

const png = PNG.sync.read(readFileSync(inPath));
const { width: w, height: h, data } = png;
const R = (116 / 512) * w;

// Signed distance from pixel center to the rounded rect; 1px anti-aliased edge.
const half = w / 2;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const qx = Math.abs(x + 0.5 - half) - (half - R);
    const qy = Math.abs(y + 0.5 - h / 2) - (h / 2 - R);
    const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - R;
    const coverage = Math.min(1, Math.max(0, 0.5 - d));
    const i = (w * y + x) * 4;
    data[i + 3] = Math.round(data[i + 3] * coverage);
  }
}

writeFileSync(outPath, PNG.sync.write(png));
console.log(`wrote ${outPath}`);
