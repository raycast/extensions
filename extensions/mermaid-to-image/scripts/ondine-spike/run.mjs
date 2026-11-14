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
import { getRenderer, RenderError } from "./runtime.mjs";

const exec = promisify(execFile);
const root = process.cwd();
const output = path.resolve(process.argv[2] ?? (await fs.mkdtemp(path.join(os.tmpdir(), "ondine-spike-"))));
await fs.mkdir(output, { recursive: true });
const started = performance.now();
const renderer = await getRenderer();
const first = renderer.render(fixtures[0].code, { now: fixedNow, responsive: false });
const coldSvgMs = performance.now() - started;
assert.equal(first.type, "flowchart");
assert.equal(await getRenderer(), renderer);

// Bundle the real application helpers without changing or stubbing their behavior.
const helperPath = path.join(output, "helpers.cjs");
await build({
  stdin: {
    contents: [
      'export {materializeSvgColorsForPreview} from "./src/utils/svg-color-materialization";',
      'export {renderSvgToRasterPreview} from "./src/utils/svg-raster";',
      'export {convertSvgToPngWithQuickLook,convertSvgToPngWithSips} from "./src/utils/macos-image-tools";',
      'export {resolveSvgRasterStrategy} from "./src/utils/svg-raster-strategy";',
      'export {supportsBeautifulMermaidSyntax} from "./src/renderers/select-renderer";',
    ].join("\n"),
    resolveDir: root,
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: helperPath,
});
const helpers = createRequire(import.meta.url)(helperPath);
const rows = [];
for (const fixture of fixtures) {
  const row = { name: fixture.name, source: fixture.code, visualReview: "pending" };
  await fs.writeFile(path.join(output, `${fixture.name}.mmd`), fixture.code);
  try {
    const start = performance.now();
    const result = renderer.render(fixture.code, { now: fixedNow, responsive: false });
    row.warmSvgMs = performance.now() - start;
    row.type = result.type;
    row.width = result.width;
    row.height = result.height;
    row.beautifulSupported = helpers.supportsBeautifulMermaidSyntax(fixture.code);
    row.existingRasterStrategy = helpers.resolveSvgRasterStrategy(result.svg);
    const materialized = helpers.materializeSvgColorsForPreview(result.svg);
    row.unresolvedCssVariables = [...new Set(materialized.match(/var\(--[\w-]+/g) ?? [])];
    await fs.writeFile(path.join(output, `${fixture.name}.svg`), result.svg);
    await fs.writeFile(path.join(output, `${fixture.name}.materialized.svg`), materialized);
    // Fixed `now` must remove the Gantt clock dependency.
    assert.equal(renderer.render(fixture.code, { now: fixedNow, responsive: false }).svg, result.svg);
    try {
      const rasterStart = performance.now();
      const raster = await helpers.renderSvgToRasterPreview({
        materializedSvgContent: materialized,
        baseName: `ondine-${fixture.name}`,
        tmpDir: output,
        renderWithQuickLook: helpers.convertSvgToPngWithQuickLook,
        renderWithSips: helpers.convertSvgToPngWithSips,
      });
      row.rasterMs = performance.now() - rasterStart;
      await fs.copyFile(raster.path, path.join(output, `${fixture.name}.macos.png`));
      // Clean only files the real helper created during this attempt.
      for (const temporary of new Set(raster.tempPaths)) await fs.rm(temporary, { force: true });
      row.macosPng = "created-not-visually-verified";
    } catch (error) {
      row.macosError = error.message;
    }
  } catch (error) {
    row.error = { code: error.code, message: error.message, line: error.line, column: error.column };
  }
  rows.push(row);
}

// Real errors, not fabricated instances: verify diagnostics and limits at the API boundary.
const errors = [];
for (const [name, source, options] of [
  ["syntax", "flowchart TD\n A[", {}],
  ["unsupported-diagram", "not-a-diagram", {}],
  ["limit", "flowchart TD\n A --> B", { limit: 5 }],
  ["semantic", "sequenceDiagram\n deactivate A", {}],
]) {
  try {
    renderer.render(source, options);
    errors.push({ name, error: "did-not-throw" });
  } catch (error) {
    errors.push({
      name,
      actual: error.code,
      isRenderError: error instanceof RenderError,
      line: error.line,
      column: error.column,
    });
  }
}
for (const error of errors) {
  assert.equal(error.actual, error.name, `Expected a real ${error.name} error`);
  assert.equal(error.isRenderError, true);
}

// Use only an already installed mmdc/Puppeteer and local Chromium. Never download a browser.
let browser;
let browserStatus;
try {
  const { stdout } = await exec("which", ["mmdc"]);
  const mmdc = await fs.realpath(stdout.trim());
  const requireMmdc = createRequire(pathToFileURL(mmdc));
  const puppeteer = requireMmdc("puppeteer");
  const executablePath =
    process.env.ONDINE_SPIKE_BROWSER ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  await fs.access(executablePath);
  browser = await puppeteer.launch({ executablePath, headless: true });
  const page = await browser.newPage();
  for (const row of rows.filter((entry) => !entry.error)) {
    const svg = await fs.readFile(path.join(output, `${row.name}.svg`), "utf8");
    await page.setContent(`<html><body style="margin:0;background:white">${svg}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.setViewport({
      width: Math.max(1, Math.ceil(row.width)),
      height: Math.max(1, Math.ceil(row.height)),
      deviceScaleFactor: 1,
    });
    await page.screenshot({ path: path.join(output, `${row.name}.browser.png`) });
    row.textOverflow = await page.evaluate(() =>
      [...document.querySelectorAll("g.ondine-node")].flatMap((node) => {
        const rect = [...node.children].find((child) => child.tagName === "rect");
        const label = [...node.children].find((child) => child.tagName === "text");
        if (!rect || !label) return [];
        const box = rect.getBoundingClientRect();
        const text = label.getBoundingClientRect();
        return text.left < box.left - 1 || text.right > box.right + 1
          ? [{ label: label.textContent, textWidth: text.width, boxWidth: box.width }]
          : [];
      }),
    );
  }
  const benchmark = [];
  const config = path.join(output, "puppeteer.json");
  await fs.writeFile(config, JSON.stringify({ executablePath }));
  for (let i = 0; i < 3; i++) {
    const start = performance.now();
    await exec(
      stdout.trim(),
      ["-i", path.join(output, "flowchart.mmd"), "-o", path.join(output, `mmdc-${i}.png`), "-p", config, "-s", "3"],
      { timeout: 60000 },
    );
    benchmark.push(performance.now() - start);
  }
  browserStatus = {
    executablePath,
    mmdcFlowchartPngMs: benchmark,
    note: "Each mmdc sample launches a process and browser; no browser download or clipboard/open action.",
  };
} catch (error) {
  browserStatus = { error: error.message };
} finally {
  if (browser) await browser.close();
}
// Include process startup and the entire existing PNG pipeline, like the mmdc samples.
const ondinePngMs = [];
for (let i = 0; i < 3; i++) {
  const start = performance.now();
  await exec(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import {createRequire} from 'node:module';
    import {getRenderer} from ${JSON.stringify(new URL("./runtime.mjs", import.meta.url).href)};
    const h=createRequire(import.meta.url)(${JSON.stringify(helperPath)});
    const r=await getRenderer();
    const {svg}=r.render(${JSON.stringify(fixtures[0].code)},{responsive:false,now:${fixedNow}});
    await h.renderSvgToRasterPreview({materializedSvgContent:h.materializeSvgColorsForPreview(svg),baseName:'ondine-benchmark-${i}',tmpDir:${JSON.stringify(output)},renderWithQuickLook:h.convertSvgToPngWithQuickLook,renderWithSips:h.convertSvgToPngWithSips});
  `,
    ],
    { timeout: 60000 },
  );
  ondinePngMs.push(performance.now() - start);
}
const report = {
  ondinePngMs,
  ondineVersion: "0.0.3",
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
  fixedNow,
  coldSvgMs,
  errors,
  browserStatus,
  rows,
  note: "Compilation, PNG creation, and DOM text bounds are automated checks, not visual approval or installed-RayCast runtime proof.",
};
await fs.writeFile(path.join(output, "results.json"), JSON.stringify(report, null, 2));
const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
await fs.writeFile(
  path.join(output, "gallery.html"),
  `<!doctype html><meta charset="utf-8"><title>Ondine spike — pending visual review</title><style>body{font:16px system-ui;margin:24px}section{border-top:1px solid #ccc;padding:12px}figure{display:inline-block;vertical-align:top;width:46%;margin:1%}img{max-width:100%;border:1px solid #ddd}pre{white-space:pre-wrap}</style><h1>Ondine 0.0.3 — visual review pending</h1><p>Left: existing materialization + macOS pipeline. Right: Chromium rendering of original Ondine SVG.</p>${rows.map((row) => `<section><h2>${escape(row.name)}</h2><pre>${escape(row.source)}</pre>${row.error ? `<pre>${escape(row.error.message)}</pre>` : `<figure><figcaption>macOS (current pipeline)</figcaption><img src="${row.name}.macos.png"></figure><figure><figcaption>Chromium (original SVG)</figcaption><img src="${row.name}.browser.png"></figure><pre>Overflow: ${escape(JSON.stringify(row.textOverflow ?? "not measured"))}</pre>`}</section>`).join("\n")}`,
);
console.log(
  JSON.stringify(
    {
      output,
      compiled: rows.filter((row) => !row.error).length,
      total: rows.length,
      macos: rows.filter((row) => row.macosPng).length,
      coldSvgMs,
      ondinePngMs,
      browserStatus,
      overflow: rows
        .filter((row) => row.textOverflow?.length)
        .map((row) => ({ name: row.name, overflow: row.textOverflow })),
      errors,
    },
    null,
    2,
  ),
);
