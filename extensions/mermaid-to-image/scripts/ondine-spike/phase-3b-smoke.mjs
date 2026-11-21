import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// Run from the repository root. Use installed tools only; never touch the GUI or clipboard.
const root = process.cwd();
const require = createRequire(path.join(root, "package.json"));
const { build } = require("esbuild");
const output = await fs.mkdtemp(path.join(os.tmpdir(), "mermaid-ondine-phase3b-"));
const browserPath = process.env.ONDINE_SPIKE_BROWSER ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const apiPath = path.join(output, "api.cjs");
await fs.writeFile(apiPath, `exports.environment = { supportPath: ${JSON.stringify(output)} };`);
const modules = {
  "./src/renderers/ondine": ["renderWithOndine"],
  "./src/renderers/ondine-png": ["writeOndinePng"],
  "./src/renderers/mmdc": ["renderWithMmdc"],
  "./src/renderers/hybrid-strategy": ["renderDiagramWithHybridStrategy"],
  "./src/utils/preview-assets": ["loadPreviewAsset"],
  "./src/utils/preview-actions": ["copyDiagramImage"],
};
const helperPath = path.join(output, "helpers.cjs");
await build({
  stdin: {
    contents: Object.entries(modules)
      .map(([file, names]) => `export { ${names.join(", ")} } from ${JSON.stringify(file)};`)
      .join("\n"),
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: helperPath,
  alias: { "@raycast/api": apiPath },
});
const h = require(helperPath);
const cliPath = await fs.realpath(execFileSync("which", ["mmdc"], { encoding: "utf8" }).trim());
const puppeteer = createRequire(pathToFileURL(cliPath))("puppeteer");
const browser = await puppeteer.launch({ executablePath: browserPath, headless: true });
const mindmap = "mindmap\n    root((開發計畫))\n        技術驗證\n        測試與發布";
const timeline = "timeline\n    title 開發時程\n    2026 : 技術驗證\n    2027 : 正式發布";
const cases = [
  ...["github-light", "github-dark"].flatMap((theme) => [
    { name: `mindmap-${theme}`, code: mindmap, theme, engine: "ondine" },
    { name: `timeline-${theme}`, code: timeline, theme, engine: "ondine" },
  ]),
  { name: "off-switch", code: mindmap, optIn: false, engine: "mmdc" },
  { name: "missing-opt-in", code: mindmap, optIn: undefined, engine: "mmdc" },
  { name: "flowchart-guard", code: "flowchart LR\n    A[使用者] --> B[登入成功]", engine: "mmdc" },
  { name: "directive-guard", code: '%%{init: {"theme":"dark"}}%%\n' + mindmap, engine: "mmdc" },
  { name: "frontmatter-guard", code: "---\nconfig:\n  theme: dark\n---\n" + mindmap, engine: "mmdc" },
  { name: "browser-failure-fallback", code: mindmap, fault: "browser", engine: "mmdc" },
  { name: "browser-timeout-fallback", code: mindmap, fault: "timeout", engine: "mmdc" },
];
const report = {
  startedAt: new Date().toISOString(),
  node: process.version,
  chrome: await browser.version(),
  output,
  helperSha256: createHash("sha256")
    .update(await fs.readFile(helperPath))
    .digest("hex"),
  note: "Production renderers and PNG preview/copy helpers with an isolated API environment. Copy callback records a path only. No Raycast GUI, clipboard/paste, Save/Open, install or download. Decode/measure is not visual acceptance.",
  results: [],
};
const temporaryPngDirectories = async () =>
  (await fs.readdir(os.tmpdir())).filter((name) => name.startsWith("mermaid-ondine-png-")).sort();
const before = await temporaryPngDirectories();
const originalBrowser = process.env.PUPPETEER_EXECUTABLE_PATH;
process.env.PUPPETEER_EXECUTABLE_PATH = browserPath;
try {
  const page = await browser.newPage();
  const decode = (data) =>
    page.evaluate(async (source) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        cornerRgba: [...context.getImageData(0, 0, 1, 1).data],
      };
    }, data);
  for (const item of cases) {
    const outputPath = path.join(output, `${item.name}.png`);
    const request = {
      code: item.code,
      originalSource: item.code,
      format: "png",
      requestedEngine: "auto",
      useOndineInAuto: Object.hasOwn(item, "optIn") ? item.optIn : true,
      outputPath,
    };
    let ondineCalls = 0;
    let mmdcCalls = 0;
    let faultObserved = false;
    const result = await h.renderDiagramWithHybridStrategy(request, {
      renderBeautiful: () => {
        throw new Error("PNG must not select Beautiful");
      },
      renderOndine: async (current) => {
        ondineCalls++;
        if (item.fault === "browser") process.env.PUPPETEER_EXECUTABLE_PATH = "/usr/bin/false";
        try {
          return await h.renderWithOndine(current, {
            themeName: item.theme ?? "github-light",
            timeoutMs: item.fault === "timeout" ? 1 : 20000,
          });
        } catch (error) {
          if (!item.fault) throw error;
          if (item.fault === "timeout") assert.equal(error.killed, true);
          faultObserved = true;
          await assert.rejects(fs.access(outputPath), { code: "ENOENT" });
          throw error;
        } finally {
          process.env.PUPPETEER_EXECUTABLE_PATH = browserPath;
        }
      },
      renderMmdc: async (current) => {
        mmdcCalls++;
        return h.renderWithMmdc(current, { preferences: { theme: "default" }, timeoutMs: 20000 });
      },
    });
    assert.equal(result.engine, item.engine);
    assert.equal(result.format, "png");
    assert.equal(result.svgRasterStrategy, undefined);
    assert.equal(ondineCalls, item.engine === "ondine" || item.fault ? 1 : 0);
    assert.equal(mmdcCalls, item.engine === "mmdc" ? 1 : 0);
    assert.equal(faultObserved, Boolean(item.fault));
    let reraster = 0;
    const unexpectedRaster = () => {
      reraster++;
      throw new Error("PNG must not rerasterize");
    };
    const preview = await h.loadPreviewAsset({
      format: "png",
      imagePath: outputPath,
      baseName: item.name,
      renderSvgPreview: unexpectedRaster,
    });
    assert.equal(preview.previewRasterPath, outputPath);
    assert.deepEqual(preview.tempPaths, []);
    const decoded = await decode(preview.imageContent);
    assert.ok(decoded.width > 0 && decoded.height > 0);
    if (result.engine === "ondine") {
      assert.ok(decoded.width <= 4096 && decoded.height <= 4096);
      assert.equal(result.rendererMetadata.theme, item.theme);
      assert.equal(result.rendererMetadata.version, "0.0.3");
      assert.deepEqual(decoded.cornerRgba, item.theme === "github-dark" ? [13, 17, 23, 255] : [255, 255, 255, 255]);
    }
    let copyCalls = 0;
    await h.copyDiagramImage({
      format: "png",
      imagePath: outputPath,
      previewRasterPath: preview.previewRasterPath,
      copyRasterImage: async (image) => {
        copyCalls++;
        assert.equal(image, outputPath);
      },
      resolveSvgCopy: unexpectedRaster,
    });
    assert.equal(copyCalls, 1);
    assert.equal(reraster, 0);
    assert.deepEqual(await temporaryPngDirectories(), before);
    report.results.push({
      name: item.name,
      engine: result.engine,
      metadata: result.rendererMetadata,
      generated: true,
      decoded,
      ondineCalls,
      mmdcCalls,
      faultObserved,
      previewCopyReusesOutput: true,
      rerasterCalls: reraster,
      temporaryCleanup: true,
      visualReview: "pending",
    });
    console.log(`${item.name} PASS ${JSON.stringify(decoded)}`);
  }
  const boundedPath = path.join(output, "bounded-4096.png");
  await h.writeOndinePng(
    '<svg xmlns="http://www.w3.org/2000/svg" width="5000" height="2000"><rect width="5000" height="2000" fill="#ffffff"/><text x="20" y="50">Bounded raster probe</text></svg>',
    boundedPath,
    20000,
  );
  const bounded = await decode(`data:image/png;base64,${(await fs.readFile(boundedPath)).toString("base64")}`);
  assert.equal(bounded.width, 4096);
  assert.equal(bounded.height, 1638);
  assert.deepEqual(await temporaryPngDirectories(), before);
  report.results.push({
    name: "bounded-4096",
    generated: true,
    decoded: bounded,
    temporaryCleanup: true,
    visualReview: "pending",
    note: "Synthetic direct PNG writer probe, not Mermaid family coverage.",
  });
  let explicitCalls = 0;
  await assert.rejects(
    h.renderDiagramWithHybridStrategy(
      {
        code: mindmap,
        format: "png",
        requestedEngine: "ondine",
        outputPath: path.join(output, "explicit-rejected.png"),
      },
      {
        renderOndine: () => {
          explicitCalls++;
        },
        renderMmdc: () => {
          explicitCalls++;
        },
        renderBeautiful: () => {
          explicitCalls++;
        },
      },
    ),
    /supports SVG only/,
  );
  assert.equal(explicitCalls, 0);
  await assert.rejects(fs.access(path.join(output, "explicit-rejected.png")), { code: "ENOENT" });
  report.results.push({
    name: "explicit-png-rejected",
    generated: false,
    rejectionVerified: true,
    rendererCalls: explicitCalls,
  });
  report.complete = true;
} catch (error) {
  report.error = { message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  if (originalBrowser === undefined) delete process.env.PUPPETEER_EXECUTABLE_PATH;
  else process.env.PUPPETEER_EXECUTABLE_PATH = originalBrowser;
  await browser.close();
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(output, "results.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`output=${output} complete=${report.complete === true}`);
}
