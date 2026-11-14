const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const src = path.resolve(__dirname, "../src");

test("all TS and TSX source files parse without TypeScript syntax errors", () => {
  for (const name of fs.readdirSync(src).filter((name) => /\.tsx?$/.test(name))) {
    const kind = name.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const source = ts.createSourceFile(name, fs.readFileSync(path.join(src, name), "utf8"), ts.ScriptTarget.Latest, true, kind);
    assert.equal(source.parseDiagnostics.length, 0, `Syntax error in ${name}: ${source.parseDiagnostics.map((d) => d.messageText).join("; ")}`);
  }
});
