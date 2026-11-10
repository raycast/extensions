import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/format.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(js, {
  module: mod,
  exports: mod.exports,
  require: (name) => {
    if (name === "@raycast/api") return { Icon: {} };
    throw new Error(`Unexpected import: ${name}`);
  },
});

const cases = [
  [0, undefined],
  [1, "1m"],
  [60, "1m"],
  [90, "2m"],
  [3569, "59m"],
  [3570, "1h"],
  [3599, "1h"],
  [3600, "1h"],
  [3630, "1h 1m"],
  [7169, "1h 59m"],
  [7170, "2h"],
  [7199, "2h"],
  [7200, "2h"],
  [86400, "24h"],
];
for (const [seconds, expected] of cases) assert.equal(mod.exports.formatDuration(seconds), expected, `${seconds}s`);
console.log(`${cases.length} duration cases passed (including hour-rounding boundaries)`);
