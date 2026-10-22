import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(await readFile(new URL("../src/lib/format.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
}).outputText;
const module = { exports: {} };
new Function("require", "module", "exports", source)(require, module, module.exports);
const { formatDuration } = module.exports;

test("formatDuration uses the unit that keeps the header short", () => {
  assert.equal(formatDuration(0), "0 µs");
  assert.equal(formatDuration(840), "840 µs");
  assert.equal(formatDuration(1500), "1.5 ms");
  assert.equal(formatDuration(10_000), "10 ms");
  assert.equal(formatDuration(250_000), "250 ms");
  assert.equal(formatDuration(1_500_000), "1.5 s");
});
