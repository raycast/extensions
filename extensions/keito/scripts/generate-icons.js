// Regenerates the extension and command icons in Keito's brand.
//
//   node scripts/generate-icons.js
//
// - assets/keito-icon.png: the Keito mark (scripts/keito-mark.svg, traced from the official
//   logo at https://keito.ai/images/keito-logo.png) in white on a Keito-color (#5046E5) tile.
// - Command icons: the existing glyphs recolored from orange to the same color. The original
//   orange versions are read from Git (first commit) so the script can be re-run.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./png");

const BRAND = [0x50, 0x46, 0xe5]; // Keito brand color #5046E5
const SUFFIX = BRAND.map((v) => v.toString(16).padStart(2, "0")).join("");
const WHITE = [255, 255, 255];
const root = path.join(__dirname, "..");
const asset = (name) => path.join(root, "assets", name);

function originalPng(name) {
  const base = execFileSync("git", ["rev-list", "--max-parents=0", "HEAD"], { cwd: root }).toString().trim();
  return readPng(execFileSync("git", ["show", `${base}:assets/${name}`], { cwd: root, maxBuffer: 1 << 26 }));
}

// Polygons from the official SVG (paths made of M/L commands).
function markPolygons() {
  const svg = fs.readFileSync(path.join(__dirname, "keito-mark.svg"), "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const polygons = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map(([, d]) => {
    const nums = d.replace(/[MLZ]/gi, " ").trim().split(/[\s,]+/).map(Number);
    const points = [];
    for (let i = 0; i < nums.length; i += 2) points.push([nums[i], nums[i + 1]]);
    return points;
  });
  return { viewBox, polygons };
}

function inside(x, y, poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function blend(pixels, i, color, amount) {
  for (let k = 0; k < 3; k++) pixels[i + k] = Math.round(pixels[i + k] * (1 - amount) + color[k] * amount);
}

// Extension icon: reuse the command icons' tile shape so the set matches.
function extensionIcon() {
  const tile = originalPng("add.png");
  const { width, height } = tile;
  const pixels = Buffer.alloc(width * height * 4);
  const { viewBox, polygons } = markPolygons();
  const [vx, vy, vw, vh] = viewBox;
  const markSize = width * 0.6;
  const scale = markSize / Math.max(vw, vh);
  const ox = (width - vw * scale) / 2, oy = (height - vh * scale) / 2;
  const samples = 4;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      pixels[i + 3] = tile.pixels[i + 3];
      if (!pixels[i + 3]) continue;
      BRAND.forEach((v, k) => (pixels[i + k] = v));
      let covered = 0;
      for (let sy = 0; sy < samples; sy++)
        for (let sx = 0; sx < samples; sx++) {
          const mx = (x + (sx + 0.5) / samples - ox) / scale + vx;
          const my = (y + (sy + 0.5) / samples - oy) / scale + vy;
          if (polygons.some((p) => inside(mx, my, p))) covered++;
        }
      if (covered) blend(pixels, i, WHITE, covered / samples ** 2);
    }
  }
  fs.writeFileSync(asset(`keito-icon-${SUFFIX}.png`), writePng(width, height, pixels));
}

// Command icons: white glyphs on orange -> white glyphs on Keito color. Orange has a blue channel near
// 0 and white 255, so the blue channel gives the anti-aliased mix between tile and glyph.
// Output names include the color, so a color change gets new file names and Raycast cannot show
// cached images.
function recolor(name) {
  const { width, height, pixels } = originalPng(name);
  for (let i = 0; i < pixels.length; i += 4) {
    const mix = pixels[i + 2] / 255;
    for (let k = 0; k < 3; k++) pixels[i + k] = Math.round(BRAND[k] * (1 - mix) + WHITE[k] * mix);
  }
  fs.writeFileSync(asset(`keito-${name.replace(".png", "")}-${SUFFIX}.png`), writePng(width, height, pixels));
}

extensionIcon();
for (const name of ["add.png", "favorite.png", "stop.png", "timer.png", "toggle.png"]) recolor(name);
console.log("icons regenerated");
