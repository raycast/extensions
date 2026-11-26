// Generates src/lib/tailwind-colors.json from the installed Tailwind CSS palette.
// Run with: npm run generate:tailwind
import { writeFileSync } from "node:fs";
import colors from "tailwindcss/colors";
import Color from "colorjs.io";

const SKIP = new Set(["inherit", "current", "transparent"]);
const palette = {};

for (const [name, value] of Object.entries(colors)) {
  if (SKIP.has(name)) continue;
  if (typeof value === "string") {
    palette[name] = new Color(value).to("srgb").toGamut().toString({ format: "hex", collapse: false });
    continue;
  }
  for (const [shade, css] of Object.entries(value)) {
    palette[`${name}-${shade}`] = new Color(css).to("srgb").toGamut().toString({ format: "hex", collapse: false });
  }
}

writeFileSync(new URL("../src/lib/tailwind-colors.json", import.meta.url), JSON.stringify(palette, null, 2) + "\n");
console.log(`Wrote ${Object.keys(palette).length} Tailwind colors`);
