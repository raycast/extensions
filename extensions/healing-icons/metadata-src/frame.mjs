// Puts a Raycast window screenshot on a 2000×1250 background, the size the Raycast Store expects.
//   node apps/raycast-extension/metadata-src/frame.mjs <input.png> <out-name> <cropX> <cropY> <cropW> <cropH>
// The crop keeps only the Raycast window (no desktop behind it).
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const [input, name, x, y, w, h] = process.argv.slice(2);
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../../..');
const { chromium } = createRequire(path.join(root, 'apps/web/package.json'))('@playwright/test');

const scale = Math.min(1700 / w, 1060 / h);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2000, height: 1250 } });
const html = path.join(dir, '.frame.html');
writeFileSync(html, `<body style="margin:0;width:2000px;height:1250px;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(1400px 900px at 15% 0%, #a7f3d0, transparent 60%), linear-gradient(135deg, #065f46, #047857 55%, #10b981)">
  <div style="width:${w * scale}px;height:${h * scale}px;overflow:hidden;border-radius:${14 * scale}px;box-shadow:0 30px 80px rgba(0,0,0,.35)">
    <img src="${pathToFileURL(path.resolve(input)).href}" style="display:block;width:${(1198 * scale).toFixed(1)}px;margin:${-y * scale}px 0 0 ${-x * scale}px">
  </div></body>`);
// Opened as a file so the page may load the local screenshot.
await page.goto(pathToFileURL(html).href);
await page.waitForLoadState('networkidle');
rmSync(html);
await page.screenshot({ path: path.join(root, 'apps/raycast-extension/metadata', `${name}.png`) });
await browser.close();
console.log(`✔ metadata/${name}.png`);
