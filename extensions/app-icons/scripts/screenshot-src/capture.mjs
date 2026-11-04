import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const playwrightPath = '/Users/neo/2026/zero/chrome-plugins/app-icons/release/screenshot-src/node_modules/playwright';
const { chromium } = require(playwrightPath);

const outDir = join(__dirname, '..', '..', 'metadata');
mkdirSync(outDir, { recursive: true });

const template = readFileSync(join(__dirname, 'panel.html'), 'utf8');
const scenes = JSON.parse(readFileSync(join(__dirname, 'scenes.json'), 'utf8'));

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
});

const context = await browser.newContext({
  viewport: { width: 2000, height: 1250 },
  deviceScaleFactor: 1,
});

for (const [name, data] of Object.entries(scenes)) {
  const page = await context.newPage();
  const injected = template.replace(
    '<script>\n    const scene = window.__SCENE__ || {};',
    `<script>\n    window.__SCENE__ = ${JSON.stringify(data)};\n    const scene = window.__SCENE__ || {};`,
  );
  const tmp = join(__dirname, `_tmp-${name}.html`);
  writeFileSync(tmp, injected);
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle' });
  try {
    await page.waitForFunction(() => {
      const imgs = [...document.images];
      if (imgs.length === 0) return true;
      return imgs.every(img => img.complete && img.naturalWidth > 0);
    }, { timeout: 30000 });
  } catch (err) {
    console.warn(`image wait soft-fail for ${name}:`, err.message);
  }
  await page.waitForTimeout(300);
  const outPath = join(outDir, `${name}.png`);
  await page.locator('#frame').screenshot({ path: outPath, type: 'png' });
  console.log(`wrote ${outPath}`);
  await page.close();
}

await browser.close();
console.log('done');
