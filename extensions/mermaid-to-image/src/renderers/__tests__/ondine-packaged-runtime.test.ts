import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { build } from "esbuild";
import { expect, it } from "vitest";

it("renders through native import of Store-style CommonJS dependencies", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ondine-packaged-runtime-"));
  try {
    const dependency = path.join(directory, "node_modules/ondine");
    await mkdir(dependency, { recursive: true });
    await writeFile(
      path.join(dependency, "package.json"),
      JSON.stringify({
        name: "ondine",
        exports: { "./compiler/wasm": "./wasm.cjs", "./compiler/wasm/all": "./all.cjs" },
      }),
    );
    // Match the Store's separately bundled, minified CommonJS dependency subpaths.
    for (const [specifier, filename] of [
      ["ondine/compiler/wasm", "wasm.cjs"],
      ["ondine/compiler/wasm/all", "all.cjs"],
    ]) {
      await build({
        stdin: { contents: `module.exports = require(${JSON.stringify(specifier)});`, resolveDir: process.cwd() },
        outfile: path.join(dependency, filename),
        bundle: true,
        minify: true,
        platform: "node",
        format: "cjs",
        target: "node22.14.0",
      });
    }
    await build({
      entryPoints: [path.resolve("src/renderers/ondine-runtime.ts")],
      outfile: path.join(directory, "runtime.cjs"),
      bundle: true,
      minify: true,
      platform: "node",
      format: "cjs",
      target: "node22.14.0",
      external: ["ondine", "ondine/*"],
    });
    await writeFile(
      path.join(directory, "verify.mjs"),
      `import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const module = await import("ondine/compiler/wasm/all");
assert.equal(module.wasm, undefined);
assert.equal(typeof module.default.wasm, "string");
const { getOndineRuntime } = require("./runtime.cjs");
const runtime = await getOndineRuntime();
for (const source of ["mindmap\\n  root((測試))\\n    A", "flowchart LR\\n A[使用者] --> B[API]"]) {
  const result = runtime.render(source);
  assert.ok(result.svg.includes("<svg"));
  assert.ok(result.svg.includes(source.startsWith("mindmap") ? "測試" : "使用者"));
}
console.log("Store-style Ondine rendering passed");
`,
    );
    const output = execFileSync(process.execPath, [path.join(directory, "verify.mjs")], {
      encoding: "utf8",
      timeout: 30_000,
    });
    expect(output).toContain("Store-style Ondine rendering passed");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
