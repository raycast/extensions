const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const moduleExports = {};
vm.runInNewContext(
  ts.transpileModule(readFileSync(join(__dirname, "../src/lib/usage-gauge.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports: moduleExports, Buffer },
);
const { usageGaugeMarkdown, escapeUsageMarkdown } = moduleExports;
function svg(percent, dark = true, stale = false, title = "5-hour") {
  const markdown = usageGaugeMarkdown(percent, title, dark, stale);
  return Buffer.from(markdown.split("base64,")[1].slice(0, -1), "base64").toString();
}

test("finite percentages stay bounded; unknown percentages never become zero quota", () => {
  assert.match(svg(-50), />0%<\/text>/);
  assert.match(svg(150), />100%<\/text>/);
  assert.match(svg(72.14), />72\.1%<\/text>/);
  for (const value of [NaN, Infinity, -Infinity]) {
    const output = svg(value);
    assert.match(output, />—<\/text>/);
    assert.doesNotMatch(output, /NaN|Infinity|>0%/);
  }
});

test("stale observations use neutral colors and an explicit historical label", () => {
  assert.match(svg(72), /#48b88c/);
  assert.match(svg(10), /#ef6262/);
  const stale = svg(72, true, true);
  assert.match(stale, /last observation/);
  assert.doesNotMatch(stale, /#48b88c|#ef6262|#d9a52d/);
  assert.match(svg(72, false), /#202126/);
  assert.match(svg(72, true), /#f5f5f7/);
});

test("provider text cannot introduce Markdown images, links, or HTML", () => {
  assert.equal(escapeUsageMarkdown("![image](https://example.com/a)"), "\\!\\[image\\]\\(https://example.com/a\\)");
  assert.equal(escapeUsageMarkdown("<img src='x'>\n# title"), "&lt;img src='x'&gt; \\# title");
  assert.equal(escapeUsageMarkdown("\\[x]"), "\\\\\\[x\\]");
  const payload = "](<https://example.com>)\n![image](https://example.com/a)";
  const markdown = usageGaugeMarkdown(72, payload, true);
  assert.ok(markdown.startsWith(`![${escapeUsageMarkdown(`${payload}: 72% remaining`)}](data:image/svg+xml;base64,`));
  assert.doesNotMatch(svg(72, true, false, payload), /example\.com|<img/);
});
