// Development-only typography atlas. No SVG renderer or font file ships in the
// runtime dependency graph: the command consumes compressed alpha masks only.
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
const labels = {
  heading: ["Create note", 12, 600],
  quick: ["Quick note", 10, 500],
  capture: ["Capture a thought", 8, 400],
  folder: ["New folder", 10, 500],
  organize: ["Organize your ideas", 8, 400],
  copy: ["Copy", 11, 500],
  notifications: ["Notifications", 11, 500],
  updates: ["Project updates", 8, 400],
  research: ["Research", 9, 500],
  ideas: ["Ideas", 9, 500],
  design: ["Design", 9, 500],
  prototype: ["Prototype", 9, 500],
  review: ["Review", 9, 500],
  handoff: ["Handoff", 9, 500],
} as const;
const atlas: Record<string, { width: number; height: number; alpha: string }> =
  {};
for (const [key, [text, size, weight]] of Object.entries(labels)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="20"><text x="0" y="15" font-family="Helvetica Neue" font-size="${size}" font-weight="${weight}" fill="white">${text}</text></svg>`;
  const rendered = new Resvg(svg, {
    fitTo: { mode: "zoom", value: 2 },
  }).render();
  const alpha = new Uint8Array(rendered.width * rendered.height);
  const pixels = rendered.pixels;
  for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3];
  atlas[key] = {
    width: rendered.width,
    height: rendered.height,
    alpha: deflateSync(alpha).toString("base64"),
  };
}
writeFileSync("assets/preview-labels.json", JSON.stringify(atlas));
console.log(
  "Generated static label alpha masks; no font files are distributed.",
);
