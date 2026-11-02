/**
 * Renders scripts/icon-source.svg to assets/extension-icon.png (512×512, transparent rounded corners).
 *   npx tsx scripts/render-icon.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

const root = path.resolve(__dirname, "..");
const svg = readFileSync(path.join(__dirname, "icon-source.svg"), "utf8");
const png = new Resvg(svg, { fitTo: { mode: "width", value: 512 } }).render().asPng();
writeFileSync(path.join(root, "assets", "extension-icon.png"), png);
console.log(`extension-icon.png: ${png.length} bytes`);
