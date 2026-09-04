const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const { runInThisContext } = require("node:vm");
const ts = require("typescript");

const filename = resolve(__dirname, "..", "src/v2/lib/poll_duration.ts");
const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: filename,
});
const compiledModule = { exports: {} };
runInThisContext(`(function(module, exports) { ${outputText}\n})`, { filename })(
  compiledModule,
  compiledModule.exports,
);

const { parsePollDurationMinutes } = compiledModule.exports;

test("poll duration accepts valid presets and custom minute values", () => {
  assert.equal(parsePollDurationMinutes("1440", ""), 1440);
  assert.equal(parsePollDurationMinutes("custom", " 45 "), 45);
  assert.equal(parsePollDurationMinutes("custom", "5"), 5);
  assert.equal(parsePollDurationMinutes("custom", "10080"), 10080);
});

test("poll duration rejects invalid custom values", () => {
  for (const value of ["", "4", "10081", "1.5", "five", "-5"]) {
    assert.equal(parsePollDurationMinutes("custom", value), undefined);
  }
});
