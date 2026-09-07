// Dev-only: renders every Cast catalog scene for visual inspection.
// Run with `npx tsx scripts/cast-preview.ts`, then rasterize with QuickLook:
//   for f in /tmp/cast-previews/*.svg; do qlmanage -t -s 620 -o /tmp/cast-previews "$f"; done
// QuickLook renders SMIL animations at their initial frame, which is exactly
// what we want for checking geometry and layering.
import { mkdirSync, writeFileSync } from "node:fs";
import { demoScenes, renderCastScene } from "../src/lib/cast";

mkdirSync("/tmp/cast-previews", { recursive: true });
const scenes = demoScenes();
scenes.forEach(({ title, scene }, i) => {
  const name = `${String(i + 1).padStart(2, "0")}-${title.toLowerCase().replace(/\s+/g, "-")}`;
  writeFileSync(`/tmp/cast-previews/${name}.svg`, renderCastScene(scene, 620, `p${i}-`));
});
console.log(`Wrote ${scenes.length} scenes to /tmp/cast-previews`);
