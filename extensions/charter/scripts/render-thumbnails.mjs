// Renders one thumbnail per chart type per library, light and dark, into
// assets/charts/<id>-<provider>.png. Mermaid and ECharts are drawn by the local
// Chrome through puppeteer-core from a local page, nothing leaves the machine.
// shadcn thumbnails are screenshots of the block previews on ui.shadcn.com, the
// one step that needs the network. Run by hand: npm run thumbnails [id|provider ...].
import { build } from "esbuild";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "assets", "charts");
const workDir = join(root, ".thumbnails");
const WIDTH = 900;
const HEIGHT = 600;
const PAD = 12;
/** ECharts draws at half size and double density so labels read at tile size. */
const ECHARTS_SCALE = 2;
/** The shadcn card is fixed at this width and centered on the 3:2 stage. */
const SHADCN_CARD_WIDTH = 640;
const PROVIDERS = ["mermaid", "shadcn", "echarts"];

const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
];
const chrome = CHROME_CANDIDATES.find((path) => path && existsSync(path));
if (!chrome) {
  console.error("No Chromium-based browser found. Set CHROME_BIN to one.");
  process.exit(1);
}

const args = process.argv.slice(2);
const onlyProviders = new Set(args.filter((arg) => PROVIDERS.includes(arg)));
const onlyIds = new Set(args.filter((arg) => !PROVIDERS.includes(arg)));

async function loadModule(entry, name) {
  mkdirSync(workDir, { recursive: true });
  const bundle = join(workDir, `${name}.mjs`);
  await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: bundle, logLevel: "silent" });
  return import(pathToFileURL(bundle).href + `?t=${Date.now()}`);
}

// The same copies the Render Chart command ships, so thumbnails match what it draws.
const vendorDir = join(root, "assets", "vendor");
const { CHARTS } = await loadModule(join(root, "src", "data", "charts.ts"), "charts");
const { buildPage, captureSelector } = await loadModule(join(root, "src", "lib", "render", "page.ts"), "page");
const { SHADCN_VIEW } = await loadModule(join(root, "src", "data", "urls.ts"), "urls");

function stageStyle(scale) {
  const width = WIDTH / scale;
  const height = HEIGHT / scale;
  const pad = PAD / scale;
  return `
  html, body { margin: 0; background: transparent; }
  #stage { width: ${width}px; height: ${height}px; box-sizing: border-box; padding: ${pad}px;
    display: flex; align-items: center; justify-content: center; overflow: hidden; }
  #stage svg { width: 100% !important; height: 100% !important; max-width: none !important; }
  #chart { width: ${width - 2 * pad}px !important; height: ${height - 2 * pad}px !important; }
`;
}

/** The Render Chart page, restyled so the drawing fills a fixed 3:2 stage. */
function thumbnailPage(source, dark, scale) {
  return buildPage(source, dark, vendorDir).replace("</head>", `<style>${stageStyle(scale)}</style></head>`);
}

async function settle(page) {
  await page.waitForFunction("window.status !== 'pending'", { timeout: 15000 });
  const status = await page.evaluate("window.status");
  if (status !== "done") throw new Error(String(status).replace(/^error: /, ""));
  // Let fonts and the canvas settle before capture.
  await new Promise((done) => setTimeout(done, 150));
}

async function renderLocal(page, source, dark, target) {
  const scale = source.kind === "echarts" ? ECHARTS_SCALE : 1;
  const file = join(workDir, `${Date.now()}.html`);
  writeFileSync(file, thumbnailPage(source, dark, scale));
  await page.setViewport({ width: WIDTH / scale, height: HEIGHT / scale, deviceScaleFactor: scale });
  await page.emulateMediaFeatures([]);
  await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
  await settle(page);
  const stage = await page.$("#stage");
  await stage.screenshot({ path: target, omitBackground: true });
  rmSync(file, { force: true });
}

/** The real block from ui.shadcn.com, its card centered on a transparent 3:2 stage. */
async function renderShadcn(page, block, dark, target) {
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }]);
  await page.goto(`${SHADCN_VIEW}/${block}`, { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForSelector("svg.recharts-surface", { timeout: 30000 });
  const card = await page.$("[data-slot=card]");
  if (!card) throw new Error(`no card on the preview page for ${block}`);
  await page.addStyleTag({
    content: `
      html, body { margin: 0 !important; padding: 0 !important; background: transparent !important; overflow: hidden; }
      [data-slot=card] { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
        width: ${SHADCN_CARD_WIDTH}px; max-height: ${HEIGHT}px; }
    `,
  });
  // Recharts refits the chart after the card changes width.
  await new Promise((done) => setTimeout(done, 600));
  await page.screenshot({ path: target, omitBackground: true, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
}

function sourceFor(chart, provider) {
  if (provider === "mermaid") return { kind: "mermaid", text: chart.mermaid.template };
  if (provider === "echarts") return chart.echarts.option ? { kind: "echarts", text: JSON.stringify(chart.echarts.option) } : undefined;
  return undefined;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
  const page = await browser.newPage();
  const done = [];
  const failed = [];

  try {
    for (const chart of CHARTS) {
      if (onlyIds.size > 0 && !onlyIds.has(chart.id)) continue;
      for (const provider of PROVIDERS) {
        if (!chart[provider]) continue;
        if (onlyProviders.size > 0 && !onlyProviders.has(provider)) continue;
        const key = `${chart.id}-${provider}`;
        try {
          for (const dark of [false, true]) {
            const target = join(outDir, `${key}${dark ? "@dark" : ""}.png`);
            if (provider === "shadcn") {
              await renderShadcn(page, chart.shadcn.block, dark, target);
            } else {
              const source = sourceFor(chart, provider);
              if (!source) throw new Error("no option in the catalog");
              await renderLocal(page, source, dark, target);
            }
          }
          done.push(key);
          console.log(`rendered ${key}`);
        } catch (error) {
          failed.push(`${key}: ${error.message}`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  if (onlyIds.size === 0 && onlyProviders.size === 0) {
    const known = new Set(CHARTS.flatMap((chart) => PROVIDERS.filter((p) => chart[p]).map((p) => `${chart.id}-${p}`)));
    for (const file of readdirSync(outDir)) {
      if (!known.has(file.replace(/(@dark)?\.png$/, ""))) rmSync(join(outDir, file));
    }
  }
  const keys = readdirSync(outDir)
    .filter((file) => file.endsWith(".png") && !file.includes("@dark"))
    .map((file) => file.replace(/\.png$/, ""))
    .sort();
  writeFileSync(
    join(root, "src", "data", "thumbnails.ts"),
    `// Generated by scripts/render-thumbnails.mjs. Do not edit by hand.\n` +
      `// "<id>-<provider>" keys with a thumbnail at assets/charts/<key>.png (and <key>@dark.png).\n` +
      `export const THUMBNAILS: string[] = [\n${keys.map((key) => `  "${key}",\n`).join("")}];\n`,
  );

  console.log(`\n${done.length} rendered, ${failed.length} failed`);
  if (failed.length > 0) {
    for (const failure of failed) console.error(`  ${failure}`);
    process.exit(1);
  }
}

await main();
