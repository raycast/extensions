// Writes the HUD scenes to dist/art-preview as SVG frames plus an index.html that animates them.
import { mkdirSync, writeFileSync } from "node:fs";
import { BUILDING_ART_IDS, buildingSvg } from "../src/art/hud-base";
import { HUD_SCENES, PREVIEW_SCENES } from "../src/art/hud-index";

const buildings = Object.fromEntries(
  BUILDING_ART_IDS.map((id) => [`building_${id}`, (f: number) => buildingSvg(id, 3, f)]),
);
const ALL: Record<string, (frame: number) => string> = {
  ...HUD_SCENES,
  ...PREVIEW_SCENES,
  ...buildings,
  building_shelter_unbuilt: (f) => buildingSvg("shelter", 0, f),
};

const out = "dist/art-preview";
mkdirSync(out, { recursive: true });

const names = ["camp", ...Object.keys(PREVIEW_SCENES), ...Object.keys(buildings), "building_shelter_unbuilt"];
for (const name of names) {
  for (let f = 0; f < 4; f++) writeFileSync(`${out}/${name}-${f}.svg`, ALL[name](f));
}

const cards = names
  .map(
    (name) => `<section><h2>${name}</h2>
<img id="${name}" src="${name}-0.svg" width="640">
<div class="strip">${[0, 1, 2, 3].map((f) => `<img src="${name}-${f}.svg" width="240">`).join("")}</div></section>`,
  )
  .join("\n");

writeFileSync(
  `${out}/index.html`,
  `<!doctype html><meta charset="utf-8"><title>Art preview</title>
<style>body{background:#111;color:#9ab;font:14px monospace;padding:24px}h2{margin:24px 0 8px}.strip{display:flex;gap:8px;margin-top:8px}</style>
${cards}
<script>let f=0;setInterval(()=>{f=(f+1)%4;for(const n of ${JSON.stringify(names)})document.getElementById(n).src=n+"-"+f+".svg"},250)</script>`,
);
console.log(`wrote ${names.length * 4} frames to ${out}`);
