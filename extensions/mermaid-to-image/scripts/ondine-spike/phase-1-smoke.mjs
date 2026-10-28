import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { fixtures, fixedNow } from "./fixtures.mjs";

const output = path.resolve(process.argv[2] ?? (await fs.mkdtemp(path.join(os.tmpdir(), "ondine-phase1-"))));
await fs.mkdir(output, { recursive: true });
const helperPath = path.join(output, "production-helpers.cjs");
await build({
  stdin: {
    contents: [
      'export { renderWithOndine } from "./src/renderers/ondine";',
      'export { getOndineRuntime } from "./src/renderers/ondine-runtime";',
      'export { applyOndineTheme, mapBeautifulThemeToOndine } from "./src/renderers/ondine-theme";',
      'export { THEMES } from "beautiful-mermaid";',
      'export { renderSvgToRasterWithBrowser } from "./src/utils/browser-svg-raster";',
      'export { loadPreviewAsset, resolveSvgCopyAsset } from "./src/utils/preview-assets";',
    ].join("\n"),
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: helperPath,
});
const helpers = createRequire(import.meta.url)(helperPath);
const executablePath =
  process.env.ONDINE_SPIKE_BROWSER ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const { stdout } = await promisify(execFile)("which", ["mmdc"]);
const puppeteer = createRequire(pathToFileURL(await fs.realpath(stdout.trim())))("puppeteer");
const browser = await puppeteer.launch({ executablePath, headless: true });
const results = [];
const productionPreviews = new Set([
  "flowchart",
  "cjk-short",
  "cjk-sequence",
  "mindmap",
  "timeline",
  "colored-edge",
  "multiple-arrows",
  "gantt",
]);
try {
  const page = await browser.newPage();
  const runtime = await helpers.getOndineRuntime();
  for (const themeName of ["github-light", "github-dark"]) {
    for (const fixture of fixtures) {
      const name = `${fixture.name}-${themeName}`;
      const outputPath = path.join(output, `${name}.svg`);
      await fs.writeFile(path.join(output, `${fixture.name}.mmd`), fixture.code);
      const result = await helpers.renderWithOndine(
        { code: fixture.code, format: "svg", requestedEngine: "ondine", outputPath },
        { themeName, now: fixedNow },
      );
      const materialized = await fs.readFile(outputPath, "utf8");
      const original = helpers.applyOndineTheme(
        runtime.render(fixture.code, { now: fixedNow, responsive: false }).svg,
        helpers.mapBeautifulThemeToOndine(helpers.THEMES[themeName]),
      );
      const dimensions = runtime.render(fixture.code, { now: fixedNow, responsive: false });
      await page.setViewport({
        width: Math.max(1, Math.ceil(dimensions.width)),
        height: Math.max(1, Math.ceil(dimensions.height)),
        deviceScaleFactor: 1,
      });
      const screenshots = [];
      for (const [stage, svg] of [
        ["original", original],
        ["materialized", materialized],
      ]) {
        await page.setContent(
          `<html><body style="margin:0"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}"></body></html>`,
        );
        await page.waitForFunction(() => document.querySelector("img").complete);
        screenshots.push(Buffer.from(await page.screenshot({ path: path.join(output, `${name}.${stage}.png`) })));
      }
      const pixelComparison = await page.evaluate(
        async (urls) => {
          const pixels = await Promise.all(
            urls.map(async (src) => {
              const image = new Image();
              image.src = src;
              await image.decode();
              const canvas = document.createElement("canvas");
              canvas.width = image.width;
              canvas.height = image.height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(image, 0, 0);
              return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            }),
          );
          let changedPixels = 0;
          let maxChannelDelta = 0;
          for (let i = 0; i < pixels[0].length; i += 4) {
            let changed = false;
            for (let channel = 0; channel < 4; channel++) {
              const delta = Math.abs(pixels[0][i + channel] - pixels[1][i + channel]);
              if (delta) changed = true;
              maxChannelDelta = Math.max(maxChannelDelta, delta);
            }
            if (changed) changedPixels++;
          }
          return { changedPixels, maxChannelDelta, totalPixels: pixels[0].length / 4 };
        },
        screenshots.map((png) => `data:image/png;base64,${png.toString("base64")}`),
      );
      const row = {
        name,
        pixelComparison,
        engine: result.engine,
        version: result.rendererMetadata.version,
        warnings: result.rendererMetadata.warnings,
        originalMaterializedPixelsEncodedEqual: screenshots[0].equals(screenshots[1]),
        visualReview: "pending",
      };
      if (productionPreviews.has(fixture.name)) {
        const renderSvgPreview = ({ materializedSvgContent, baseName }) =>
          helpers.renderSvgToRasterWithBrowser({
            svgContent: materializedSvgContent,
            baseName,
            tmpDir: output,
            browserExecutablePath: executablePath,
          });
        const preview = await helpers.loadPreviewAsset({
          format: "svg",
          imagePath: outputPath,
          baseName: `${name}.production`,
          requireRaster: true,
          renderSvgPreview,
        });
        const copy = await helpers.resolveSvgCopyAsset({
          svgPath: outputPath,
          previewRasterPath: preview.previewRasterPath,
          baseName: `${name}.copy`,
          renderSvgPreview: () => {
            throw new Error("Copy must reuse the preview PNG");
          },
        });
        assert.equal(copy.path, preview.previewRasterPath);
        assert.match(preview.imageContent, /^data:image\/png;base64,/);
        row.previewCopySamePng = true;
        row.productionPng = path.basename(copy.path);
        for (const temporary of preview.tempPaths.filter((file) => !file.endsWith(".png")))
          await fs.rm(temporary, { force: true });
      }
      results.push(row);
    }
  }
} finally {
  await browser.close();
}
const report = {
  note: "Real production renderer/materializer/browser raster/preview-copy helpers in shell Node. No clipboard changes, GUI launch, browser download or actual Raycast host test. PNG creation is not visual acceptance.",
  node: process.version,
  executablePath,
  results,
};
await fs.writeFile(path.join(output, "phase-1-results.json"), JSON.stringify(report, null, 2));
await fs.writeFile(
  path.join(output, "gallery.html"),
  `<!doctype html><meta charset="utf-8"><title>Ondine Phase 1</title><style>body{font:14px system-ui}section{border-top:1px solid #888;padding:16px}img{max-width:100%;display:block;margin:8px 0}</style>${results.map((row) => `<section><h2>${row.name}</h2><p>Before/after materialization encoded pixels equal: ${row.originalMaterializedPixelsEncodedEqual}; visual review pending</p><img src="${row.name}.original.png"><img src="${row.name}.materialized.png">${row.productionPng ? `<h3>Production preview / Copy Image PNG</h3><img src="${row.productionPng}">` : ""}</section>`).join("")}`,
);
console.log(
  JSON.stringify(
    {
      output,
      rendered: results.length,
      encodedEqual: results.filter((row) => row.originalMaterializedPixelsEncodedEqual).length,
      productionPreviewCopy: results.filter((row) => row.previewCopySamePng).length,
    },
    null,
    2,
  ),
);
