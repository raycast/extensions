const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const fs = require("node:fs");
const ts = require("typescript");

const sourcePath = path.join(__dirname, "..", "src", "text.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2021,
  },
});

const moduleUnderTest = { exports: {} };
const runCompiledModule = new Function("exports", "require", "module", "__filename", "__dirname", compiled.outputText);
runCompiledModule(moduleUnderTest.exports, require, moduleUnderTest, sourcePath, path.dirname(sourcePath));

const { normalizeChinesePunctuationText } = moduleUnderTest.exports;

test("keeps English URLs, decimals, and code-like text unchanged", () => {
  const input = "Visit https://example.com/a,b?x=1.23; const value = foo.bar();";

  assert.equal(normalizeChinesePunctuationText(input), input);
});

test("normalizes common punctuation around Chinese text", () => {
  assert.equal(normalizeChinesePunctuationText("你好, 世界.真的嗎? 是!"), "你好，世界。真的嗎？是！");
});

test("preserves decimal dots while normalizing mixed Chinese-English punctuation", () => {
  assert.equal(normalizeChinesePunctuationText("版本 1.2.3, 可用於中文, English."), "版本 1.2.3，可用於中文，English。");
});

test("normalizes OCR-like Chinese quote mistakes", () => {
  assert.equal(normalizeChinesePunctuationText("[ 你好]"), "「你好」");
  assert.equal(normalizeChinesePunctuationText("「你好l"), "「你好」");
});
