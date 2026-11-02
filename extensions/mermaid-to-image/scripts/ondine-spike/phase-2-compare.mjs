import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { fixtures, fixedNow } from "./fixtures.mjs";
import {
  buildGallery,
  createRunDirectory,
  describeError,
  runIsolatedWorker,
  summarizeRows,
} from "./phase-2-evidence.mjs";

const execute = promisify(execFile);
const root = fileURLToPath(new URL("../../", import.meta.url));
const options = parseOptions(process.argv.slice(2));
if (options.help) {
  console.log(
    "node scripts/ondine-spike/phase-2-compare.mjs [NEW_OUTPUT_DIRECTORY] [--fixtures=flowchart,cjk-short] [--themes=github-light,github-dark] [--native] [--timeout-ms=90000]\nExisting directories are rejected. No clipboard, GUI, installation or browser download. --native probes only the selected cases; it does not change production routing.",
  );
} else {
  const output = await createRunDirectory(options.output);
  const rows = [];
  const selected = fixtures.filter((fixture) => options.fixtures.includes(fixture.name));
  const expectedCases = selected.length * options.themes.length;
  const report = {
    schemaVersion: 1,
    output,
    startedAt: new Date().toISOString(),
    fixedNow,
    note: "Automation evidence, not visual approval or actual Raycast clipboard testing. Production renderer and preview/copy helpers are reused without modifying routing. Native probe is optional.",
    options,
    environment: { node: process.version, platform: process.platform, arch: process.arch, osRelease: os.release() },
    results: rows,
  };
  const save = async () => {
    report.summary = summarizeRows(rows, expectedCases);
    if (report.setupError) report.summary.automationComplete = false;
    await fs.writeFile(path.join(output, "phase-2-results.json"), JSON.stringify(report, null, 2));
    await fs.writeFile(path.join(output, "gallery.html"), buildGallery(rows, report.summary));
  };
  await save();
  try {
    const helperPath = path.join(output, "production-helpers.cjs");
    const exports = {
      "./src/renderers/ondine": ["renderWithOndine"],
      "./src/renderers/ondine-runtime": ["getOndineRuntime"],
      "./src/renderers/ondine-theme": ["applyOndineTheme", "mapBeautifulThemeToOndine"],
      "beautiful-mermaid": ["THEMES"],
      "./src/utils/browser-svg-raster": ["renderSvgToRasterWithBrowser"],
      "./src/utils/preview-assets": ["loadPreviewAsset", "resolveSvgCopyAsset"],
      "./src/utils/svg-preview": ["getSupersampledSize", "parseSvgPixelDimensions"],
      "./src/utils/svg-raster": ["renderSvgToRasterPreview"],
      "./src/utils/macos-image-tools": ["convertSvgToPngWithQuickLook", "convertSvgToPngWithSips"],
    };
    await build({
      stdin: {
        contents: Object.entries(exports)
          .map(([file, names]) => `export { ${names.join(", ")} } from ${JSON.stringify(file)};`)
          .join("\n"),
        resolveDir: root,
      },
      bundle: true,
      platform: "node",
      format: "cjs",
      outfile: helperPath,
      // Auto PNG adds browser discovery to the shared renderer's import graph.
      // The SVG evidence run remains headless and never calls Raycast APIs.
      alias: { "@raycast/api": path.join(root, "test-stubs/raycast-api.ts") },
    });
    const pixelBundlePath = path.join(output, "evidence-pixels.js");
    await build({
      entryPoints: [path.join(root, "scripts/ondine-spike/phase-2-pixels.mjs")],
      bundle: true,
      platform: "browser",
      format: "iife",
      globalName: "EvidencePixels",
      outfile: pixelBundlePath,
    });
    const executablePath =
      process.env.ONDINE_SPIKE_BROWSER ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    await fs.access(executablePath);
    const { stdout } = await execute("which", ["mmdc"], { timeout: 5000 });
    const require = createRequire(pathToFileURL(await fs.realpath(stdout.trim())));
    const puppeteerPath = require.resolve("puppeteer");
    report.environment.browserExecutable = executablePath;
    report.environment.puppeteer = JSON.parse(
      await fs.readFile(require.resolve("puppeteer/package.json"), "utf8"),
    ).version;
    report.environment.ondine = JSON.parse(
      await fs.readFile(path.join(root, "node_modules/ondine/package.json"), "utf8"),
    ).version;
    report.environment.macos =
      process.platform === "darwin" ? (await execute("sw_vers", [], { timeout: 5000 })).stdout.trim() : null;
    report.environment.fonts = await fontSnapshot();
    report.provenance = await sourceSnapshot(helperPath);
    report.capture = {
      reference: "Puppeteer img.decode + document.fonts.ready + two RAF, ceil SVG viewport, deviceScaleFactor=1",
      production:
        "Existing browser CLI helper, factor=3, maxEdge=4096, deviceScaleFactor=1, virtual-time-budget=1000; source SVG and HTML retained",
      worker: { timeoutMs: options.timeoutMs, nodeHeapMiB: 512, concurrency: 1, outputTailCharacters: 16000 },
    };
    for (const themeName of options.themes) {
      for (const fixture of selected) {
        const name = `${fixture.name}-${themeName}`;
        const caseDirectory = path.join(output, name);
        await fs.mkdir(caseDirectory);
        const configPath = path.join(caseDirectory, "config.json");
        await fs.writeFile(
          configPath,
          JSON.stringify(
            {
              output,
              caseDirectory,
              fixture,
              themeName,
              fixedNow,
              helperPath,
              pixelBundlePath,
              puppeteerPath,
              executablePath,
              native: options.native,
            },
            null,
            2,
          ),
        );
        const worker = await runIsolatedWorker([path.join(root, "scripts/ondine-spike/phase-2-case.mjs"), configPath], {
          timeoutMs: options.timeoutMs,
        });
        let row;
        try {
          row = JSON.parse(await fs.readFile(path.join(caseDirectory, "result.json"), "utf8"));
        } catch (error) {
          row = {
            name,
            sourceFile: `${name}/source.mmd`,
            generated: {},
            measured: {},
            completed: false,
            visualReview: { status: "pending", reviewer: null, reason: null },
            workerError: describeError(error),
          };
        }
        row.worker = worker;
        if (worker.code !== 0 || worker.timedOut)
          row.workerError = {
            message: worker.timedOut ? "Worker deadline exceeded" : "Worker exited unsuccessfully",
            code: worker.code,
            signal: worker.signal,
          };
        rows.push(row);
        await fs.writeFile(path.join(caseDirectory, "result.json"), JSON.stringify(row, null, 2));
        await save();
        console.log(
          `${rows.length}/${expectedCases} ${name}: ${summarizeRows([row], 1).automationComplete ? "measured; visual pending" : "ERROR (see result.json)"}`,
        );
      }
    }
  } catch (error) {
    report.setupError = describeError(error);
  } finally {
    report.finishedAt = new Date().toISOString();
    await save();
    console.log(JSON.stringify({ output, ...report.summary, setupError: report.setupError }, null, 2));
    if (!report.summary.automationComplete) process.exitCode = 1;
  }
}

function parseOptions(args) {
  const result = {
    fixtures: fixtures.map((fixture) => fixture.name),
    themes: ["github-light", "github-dark"],
    native: false,
    timeoutMs: 90000,
  };
  for (const argument of args) {
    if (argument === "--help") result.help = true;
    else if (argument === "--native") result.native = true;
    else if (argument.startsWith("--fixtures=")) result.fixtures = argument.slice(11).split(",");
    else if (argument.startsWith("--themes=")) result.themes = argument.slice(9).split(",");
    else if (argument.startsWith("--timeout-ms=")) result.timeoutMs = Number(argument.slice(13));
    else if (!argument.startsWith("--") && !result.output) result.output = argument;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  for (const [key, valid] of [
    ["fixtures", fixtures.map((fixture) => fixture.name)],
    ["themes", ["github-light", "github-dark"]],
  ]) {
    if (new Set(result[key]).size !== result[key].length || result[key].some((value) => !valid.includes(value)))
      throw new Error(`Invalid or duplicate ${key}`);
  }
  if (!Number.isInteger(result.timeoutMs) || result.timeoutMs < 100 || result.timeoutMs > 300000)
    throw new Error("Worker timeout must be between 100 and 300000 ms");
  return result;
}

async function fontSnapshot() {
  const directories = [
    "/System/Library/Fonts",
    "/System/Library/Fonts/Supplemental",
    "/Library/Fonts",
    path.join(os.homedir(), "Library/Fonts"),
  ];
  const files = [];
  for (const directory of directories) {
    try {
      for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        const stat = await fs.stat(path.join(directory, entry.name));
        files.push({ directory, name: entry.name, bytes: stat.size, modified: stat.mtime.toISOString() });
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return {
    files,
    limitation:
      "Top-level system, supplemental, shared and user font file inventory only; not resolved glyph font attribution or a complete activated-font inventory.",
  };
}

async function sourceSnapshot(helperPath) {
  const files = [
    "package-lock.json",
    "scripts/ondine-spike/fixtures.mjs",
    "scripts/ondine-spike/phase-2-compare.mjs",
    "scripts/ondine-spike/phase-2-case.mjs",
    "scripts/ondine-spike/phase-2-evidence.mjs",
    "scripts/ondine-spike/phase-2-pixels.mjs",
  ];
  const hashes = {};
  for (const file of files)
    hashes[file] = createHash("sha256")
      .update(await fs.readFile(path.join(root, file)))
      .digest("hex");
  hashes["production-helpers.cjs"] = createHash("sha256")
    .update(await fs.readFile(helperPath))
    .digest("hex");
  const head = (await execute("git", ["rev-parse", "HEAD"], { cwd: root, timeout: 5000 })).stdout.trim();
  return {
    head,
    hashes,
    note: "Working tree is not assumed clean; bundled production helper hash identifies the tested code, HEAD alone does not.",
  };
}
