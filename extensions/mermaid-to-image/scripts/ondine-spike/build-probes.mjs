import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
import { Worker } from "node:worker_threads";

const exec = promisify(execFile);
const root = process.cwd();
const output = path.resolve(process.argv[2] ?? (await fs.mkdtemp(path.join(os.tmpdir(), "ondine-build-"))));
await fs.mkdir(output, { recursive: true });
const manifest = JSON.parse(await fs.readFile("package.json", "utf8"));
const probe = {
  baseline: 'export default function probe() { return {type: "baseline"}; }',
  A: 'import {render} from "ondine/compiler"; export default function probe() { return render("flowchart LR\\n A --> B"); }',
  B: 'import {create} from "ondine/compiler/wasm"; export default async function probe() { const {wasm} = await import("ondine/compiler/wasm/all"); return create({modules:{all:wasm}}).render("flowchart LR\\n A --> B"); }',
  C: '/// <reference lib="dom" />\nimport {create} from "ondine/compiler/wasm"; import {environment} from "@raycast/api"; import {readFileSync} from "node:fs"; import path from "node:path"; export default function probe() { return create({modules:{all:new WebAssembly.Module(readFileSync(path.join(environment.assetsPath,"ondine-all.fast.wasm")))}}).render("flowchart LR\\n A --> B"); }',
};

async function files(directory) {
  const all = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name);
    if (entry.isDirectory()) all.push(...(await files(name)));
    else all.push(name);
  }
  return all;
}
async function detachedProbe(bundle, assetsPath) {
  // Node worker + Raycast API stub proves packaged path independence only.
  // It cannot prove execution inside the real installed Raycast host.
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    const worker = new Worker(
      `
      const {parentPort, workerData} = require('node:worker_threads');
      const Module = require('node:module');
      const original = Module._load;
      Module._load = function(id, ...args) {
        if (id === '@raycast/api') return {environment:{assetsPath:workerData.assetsPath}};
        return original.call(this, id, ...args);
      };
      (async () => {
        try {
          const start = performance.now();
          const result = await require(workerData.bundle).default();
          parentPort.postMessage({ok:true,type:result.type,totalMs:performance.now()-start});
        } catch (e) { parentPort.postMessage({ok:false,message:e.message}); }
      })();`,
      { eval: true, workerData: { bundle, assetsPath }, resourceLimits: { maxOldGenerationSizeMb: 128 } },
    );
    worker.once("message", (result) => {
      finish(result);
      void worker.terminate();
    });
    worker.once("error", (error) => finish({ ok: false, message: error.message }));
    worker.once("exit", (code) => finish({ ok: false, message: `Worker exited before result: ${code}` }));
  });
}
const results = [];
for (const [variant, source] of Object.entries(probe)) {
  const workspace = await fs.mkdtemp(path.join(output, `workspace-${variant}-`));
  const dist = path.join(workspace, "dist");
  for (const file of ["tsconfig.json", ".prettierrc", "eslint.config.js", "raycast-env.d.ts"]) {
    await fs.copyFile(path.join(root, file), path.join(workspace, file));
  }
  // Ondine uses package exports; the existing legacy TS resolver cannot read them.
  // Test the smallest modern bundler config in the temporary copy, never in production.
  const tsconfig = JSON.parse(await fs.readFile(path.join(workspace, "tsconfig.json"), "utf8"));
  tsconfig.compilerOptions.module = "ESNext";
  tsconfig.compilerOptions.moduleResolution = "bundler";
  tsconfig.compilerOptions.lib = [...new Set([...tsconfig.compilerOptions.lib, "DOM"])];
  await fs.writeFile(path.join(workspace, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));
  await fs.cp(path.join(root, "src"), path.join(workspace, "src"), { recursive: true });
  await fs.cp(path.join(root, "assets"), path.join(workspace, "assets"), { recursive: true });
  await fs.symlink(path.join(root, "node_modules"), path.join(workspace, "node_modules"), "dir");
  // Reachable exports in BOTH real entry points model eventual manual + AI bundling.
  for (const [file, relative] of [
    ["src/mermaid-to-image.tsx", "./ondine-spike"],
    ["src/tools/generate-mermaid-diagram-with-ai.ts", "../ondine-spike"],
  ]) {
    await fs.appendFile(path.join(workspace, file), `\nexport {default as ondineSpikeProbe} from "${relative}";\n`);
  }
  await fs.writeFile(path.join(workspace, "src/ondine-spike.ts"), source);
  const tempManifest = structuredClone(manifest);
  tempManifest.commands.push({
    name: "ondine-spike",
    title: "Ondine Spike",
    description: "Disposable WASM loading probe",
    mode: "no-view",
  });
  await fs.writeFile(path.join(workspace, "package.json"), JSON.stringify(tempManifest, null, 2));
  if (variant === "C") {
    const wasm = createRequire(import.meta.url).resolve("ondine/compiler/wasm/all.fast.wasm");
    await fs.copyFile(wasm, path.join(workspace, "assets/ondine-all.fast.wasm"));
  }
  const row = {
    variant,
    temporaryTypeScriptConfig: { module: "ESNext", moduleResolution: "bundler", addedLib: "DOM" },
  };
  try {
    const { stdout, stderr } = await exec(
      path.join(root, "node_modules/.bin/ray"),
      ["build", "-e", "dist", "-o", dist, "--exit-on-error"],
      { cwd: workspace, timeout: 120000, maxBuffer: 1024 * 1024 },
    );
    await fs.writeFile(path.join(output, `${variant}-build.log`), stdout + stderr);
    const artifacts = await files(dist);
    // Exclude the extra probe entry. Report both real entry points + assets,
    // source maps separately, and per-file gzip estimate (NOT a Store archive size).
    const shipped = artifacts.filter(
      (file) => !path.basename(file).startsWith("ondine-spike.") && path.basename(file) !== "package.json",
    );
    let runtimeBytes = 0,
      sourceMapBytes = 0,
      gzipEstimateBytes = 0;
    for (const file of shipped) {
      const data = await fs.readFile(file);
      if (file.endsWith(".map")) sourceMapBytes += data.length;
      else {
        runtimeBytes += data.length;
        gzipEstimateBytes += gzipSync(data).length;
      }
    }
    row.build = "passed";
    row.runtimeBytes = runtimeBytes;
    row.sourceMapBytes = sourceMapBytes;
    row.gzipEstimateBytes = gzipEstimateBytes;
    // Copy only the probe and assets to a package with no node_modules nearby.
    const detached = path.join(output, `detached-${variant}`);
    await fs.mkdir(detached, { recursive: true });
    await fs.copyFile(path.join(dist, "ondine-spike.js"), path.join(detached, "probe.cjs"));
    await fs.cp(path.join(dist, "assets"), path.join(detached, "assets"), { recursive: true });
    row.detachedNodeWorker = await detachedProbe(path.join(detached, "probe.cjs"), path.join(detached, "assets"));
  } catch (error) {
    row.build = "failed";
    row.error = error.message;
    await fs.writeFile(
      path.join(output, `${variant}-build.log`),
      `${error.stdout ?? ""}\n${error.stderr ?? ""}\n${error.message}`,
    );
  }
  row.installedRaycast = "not-tested";
  results.push(row);
}
const baseline = results[0];
for (const row of results.slice(1)) {
  if (row.build === "passed") {
    row.runtimeDeltaBytes = row.runtimeBytes - baseline.runtimeBytes;
    row.sourceMapDeltaBytes = row.sourceMapBytes - baseline.sourceMapBytes;
    row.gzipEstimateDeltaBytes = row.gzipEstimateBytes - baseline.gzipEstimateBytes;
  }
}
await fs.writeFile(
  path.join(output, "build-results.json"),
  JSON.stringify(
    {
      node: process.version,
      api: createRequire(import.meta.url)("@raycast/api/package.json").version,
      note: "Distribution build + detached Node worker checks only. Not a Store archive measurement or installed-RayCast runtime test. Both production entry points export the probe in temporary copies only.",
      results,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ output, results }, null, 2));
