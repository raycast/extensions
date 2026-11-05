import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { describeError, recordStage } from "./phase-2-evidence.mjs";

const config = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
const { output, caseDirectory, fixture, themeName } = config;
const prefix = path.basename(caseDirectory);
const relative = (file) => path.relative(output, file);
const row = {
  name: prefix,
  sourceFile: relative(path.join(caseDirectory, "source.mmd")),
  theme: themeName,
  nativeRequested: config.native,
  generated: Object.fromEntries(
    ["svg", "original", "materialized", "production", "native"].map((name) => [
      name,
      { status: "not-run", reason: "stage not reached" },
    ]),
  ),
  measured: Object.fromEntries(
    ["materialization", "production", "native"].map((name) => [
      name,
      { status: "not-run", reason: "stage not reached" },
    ]),
  ),
  completed: false,
  visualReview: { status: "pending", reviewer: null, reason: null },
};
const checkpoint = () => fs.writeFile(path.join(caseDirectory, "result.json"), JSON.stringify(row, null, 2));
async function stage(group, name, action) {
  const success = await recordStage(row[group], name, action);
  await checkpoint();
  return success;
}
let browser;
try {
  await checkpoint();
  await fs.writeFile(path.join(caseDirectory, "source.mmd"), fixture.code);
  const require = createRequire(import.meta.url);
  const helpers = require(config.helperPath);
  const puppeteer = require(config.puppeteerPath);
  const runtime = await helpers.getOndineRuntime();
  const materializedPath = path.join(caseDirectory, "materialized.svg");
  let original;
  let materialized;
  let compiled;
  const svgOk = await stage("generated", "svg", async () => {
    compiled = runtime.render(fixture.code, { now: config.fixedNow, responsive: false });
    original = helpers.applyOndineTheme(compiled.svg, helpers.mapBeautifulThemeToOndine(helpers.THEMES[themeName]));
    const result = await helpers.renderWithOndine(
      { code: fixture.code, format: "svg", requestedEngine: "ondine", outputPath: materializedPath },
      { themeName, now: config.fixedNow },
    );
    materialized = await fs.readFile(materializedPath, "utf8");
    await fs.writeFile(path.join(caseDirectory, "original.svg"), original);
    row.renderer = { engine: result.engine, ...result.rendererMetadata };
    return {
      original: relative(path.join(caseDirectory, "original.svg")),
      materialized: relative(materializedPath),
      dimensions: { width: compiled.width, height: compiled.height },
      fontFamilies: [...new Set([...original.matchAll(/font-family[=:]["']?([^;"'<>]+)/g)].map((match) => match[1]))],
    };
  });
  if (!svgOk) throw new Error("SVG stage failed; dependent stages not run");
  browser = await puppeteer.launch({ executablePath: config.executablePath, headless: true, timeout: 20000 });
  row.browserVersion = await browser.version();
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(15000);
  await page.goto("about:blank");
  await page.addScriptTag({ path: config.pixelBundlePath });
  row.fontProbes = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    fonts: Object.fromEntries(
      ["12px system-ui", '12px "PingFang TC"', '12px "Arial"'].map((font) => [
        font,
        document.fonts.check(font, "使用者 User"),
      ]),
    ),
    limitation:
      "document.fonts.check is availability telemetry, not proof of the actual font selected for external SVG text.",
  }));
  const width = Math.ceil(compiled.width);
  const height = Math.ceil(compiled.height);
  assert.ok(width > 0 && height > 0 && width <= 4096 && height <= 4096, "Reference viewport outside 1..4096 bounds");
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  row.capture = {
    viewport: { width, height, deviceScaleFactor: 1 },
    background: "transparent; SVG root theme supplies background",
    fontWait:
      "img.decode + positive natural dimensions; document.fonts.ready + two animation frames. Parent font readiness cannot certify external SVG font selection.",
  };
  for (const [name, svg] of [
    ["original", original],
    ["materialized", materialized],
  ]) {
    await stage("generated", name, async () => {
      await page.setContent(
        `<html><body style="margin:0;background:transparent"><img id="diagram" src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}"></body></html>`,
      );
      await page.addScriptTag({ path: config.pixelBundlePath });
      const svgDimensions = await page.evaluate(async () => {
        const image = document.querySelector("#diagram");
        await image.decode();
        if (!image.naturalWidth || !image.naturalHeight) throw new Error("SVG decoded without positive dimensions");
        await document.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { width: image.naturalWidth, height: image.naturalHeight };
      });
      const file = path.join(caseDirectory, `${name}.png`);
      await page.screenshot({ path: file, omitBackground: true });
      const dimensions = await inspectPng(page, file);
      assert.equal(dimensions.width, width, "Reference PNG viewport width mismatch");
      assert.equal(dimensions.height, height, "Reference PNG viewport height mismatch");
      return { file: relative(file), dimensions, svgNaturalDimensions: svgDimensions };
    });
  }
  if (["original", "materialized"].every((key) => row.generated[key]?.status === "ok")) {
    await stage("measured", "materialization", async () => {
      const urls = await Promise.all(
        ["original", "materialized"].map(async (name) => pngUrl(path.join(caseDirectory, `${name}.png`))),
      );
      const result = await page.evaluate(async (urls) => {
        const h = globalThis.EvidencePixels;
        const pixels = await Promise.all(urls.map(async (url) => h.imagePixels(await h.decodeImage(url))));
        const { diff, ...comparison } = h.compareRgba(...pixels);
        return { ...comparison, diffUrl: h.encodePixels({ ...pixels[0], data: diff }) };
      }, urls);
      const diffFile = path.join(caseDirectory, "materialization-diff.png");
      await fs.writeFile(diffFile, Buffer.from(result.diffUrl.split(",")[1], "base64"));
      const { diffUrl, ...comparison } = result;
      return { ...comparison, diffFile: relative(diffFile), diffAmplification: 32 };
    });
  } else row.measured.materialization = { status: "not-run", reason: "reference capture failed" };

  const productionOk = await stage("generated", "production", async () => {
    const renderSvgPreview = ({ materializedSvgContent, baseName }) =>
      helpers.renderSvgToRasterWithBrowser({
        svgContent: materializedSvgContent,
        baseName,
        tmpDir: caseDirectory,
        browserExecutablePath: config.executablePath,
      });
    const preview = await helpers.loadPreviewAsset({
      format: "svg",
      imagePath: materializedPath,
      baseName: "production",
      requireRaster: true,
      renderSvgPreview,
    });
    const copy = await helpers.resolveSvgCopyAsset({
      svgPath: materializedPath,
      previewRasterPath: preview.previewRasterPath,
      baseName: "copy",
      renderSvgPreview: () => {
        throw new Error("Copy must reuse preview PNG");
      },
    });
    assert.equal(copy.path, preview.previewRasterPath);
    assert.match(preview.imageContent, /^data:image\/png;base64,/);
    return {
      file: relative(copy.path),
      previewCopySamePng: true,
      requestedFactor: 3,
      maxEdge: 4096,
      background: "transparent CLI background plus themed SVG root",
    };
  });
  if (productionOk) {
    await stage("measured", "production", async () => {
      const dimensions = await inspectPng(page, path.join(output, row.generated.production.file));
      const expected = helpers.getSupersampledSize(helpers.parseSvgPixelDimensions(materialized), 3, 4096);
      assert.equal(dimensions.width, expected.width, "production PNG width mismatch");
      assert.equal(dimensions.height, expected.height, "production PNG height mismatch");
      return {
        ...dimensions,
        scaleX: dimensions.width / compiled.width,
        scaleY: dimensions.height / compiled.height,
        expected,
      };
    });
  } else row.measured.production = { status: "not-run", reason: "production generation failed" };

  if (config.native) {
    const nativeOk = await stage("generated", "native", async () => {
      const raster = await helpers.renderSvgToRasterPreview({
        materializedSvgContent: materialized,
        baseName: `${path.basename(output)}-${prefix}-native`,
        tmpDir: caseDirectory,
        renderWithQuickLook: helpers.convertSvgToPngWithQuickLook,
        renderWithSips: helpers.convertSvgToPngWithSips,
      });
      const file = path.join(caseDirectory, "native.png");
      await fs.copyFile(raster.path, file);
      for (const temporary of new Set(raster.tempPaths)) await fs.rm(temporary, { force: true });
      return { file: relative(file), factors: [3, 2, 1], maxEdge: 4096 };
    });
    if (nativeOk)
      await stage("measured", "native", async () => {
        const dimensions = await inspectPng(page, path.join(caseDirectory, "native.png"));
        return {
          ...dimensions,
          scaleX: dimensions.width / compiled.width,
          scaleY: dimensions.height / compiled.height,
        };
      });
  } else
    row.generated.native = {
      status: "skipped",
      reason: "native probe not requested; production remains browser-backed",
    };
  row.completed = true;
} catch (error) {
  row.workerError = describeError(error);
} finally {
  await checkpoint();
  if (browser) await browser.close();
}

async function pngUrl(file) {
  return `data:image/png;base64,${(await fs.readFile(file)).toString("base64")}`;
}
async function inspectPng(page, file) {
  const url = await pngUrl(file);
  return page.evaluate(async (src) => {
    const image = await globalThis.EvidencePixels.decodeImage(src);
    return { width: image.naturalWidth, height: image.naturalHeight, decoded: true };
  }, url);
}
