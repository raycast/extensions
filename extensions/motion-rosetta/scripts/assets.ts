import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { graphSVG } from "../src/lib/graph.ts";
import { parse } from "../src/lib/parse.ts";

writeFileSync(
  "assets/extension-icon.png",
  new Resvg(readFileSync("scripts/sources/extension-icon.svg"))
    .render()
    .asPng(),
);
mkdirSync(".artifacts/graphs", { recursive: true });
for (const theme of ["dark", "light"] as const) {
  for (const [name, input] of [
    ["bezier", "0.42, 0, 0.58, 1"],
    ["spring", ".spring(duration: 0.5, bounce: 0.6)"],
  ] as const) {
    writeFileSync(
      `.artifacts/graphs/${name}-${theme}.png`,
      new Resvg(graphSVG(parse(input).easing, theme), {
        fitTo: { mode: "zoom", value: 2 },
      })
        .render()
        .asPng(),
    );
  }
}
console.log("Generated original 512×512 icon and light/dark graph previews.");
