/**
 * Renders assets/extension-icon.svg to 512×512 PNG for Raycast.
 * Run: npm run generate-icon  (requires devDependency `sharp`)
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

async function main() {
  const sharp = require("sharp");
  const root = join(__dirname, "..");
  const svgPath = join(root, "assets", "extension-icon.svg");
  const svg = readFileSync(svgPath);
  const buf = await sharp(svg).resize(512, 512).png({ compressionLevel: 9 }).toBuffer();
  const outRoot = join(root, "extension-icon.png");
  const outAssets = join(root, "assets", "extension-icon.png");
  writeFileSync(outRoot, buf);
  writeFileSync(outAssets, buf);
  console.log("Wrote extension-icon.png and assets/extension-icon.png (512×512)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
