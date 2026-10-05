import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/bookmarks-parser.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
});
const { parseBookmarks } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const cases = [
  {
    name: "reads a regular bookmark with a description",
    line: "- [Example](https://example.com) - Example site",
    title: "Example",
    url: "https://example.com",
    description: "Example site",
  },
  {
    name: "reads brackets in a bookmark title",
    line: "- [[PDF] Title](https://example.com/document.pdf) - Document",
    title: "[PDF] Title",
    url: "https://example.com/document.pdf",
    description: "Document",
  },
  {
    name: "reads balanced parentheses in a Wikipedia URL",
    line: "- [Mercury](https://en.wikipedia.org/wiki/Mercury_(planet)) - Wikipedia",
    title: "Mercury",
    url: "https://en.wikipedia.org/wiki/Mercury_(planet)",
    description: "Wikipedia",
  },
  {
    name: "reads nested parentheses in a URL",
    line: "- [Foo](https://example.com/Foo_(bar_(baz))) - Nested (example)",
    title: "Foo",
    url: "https://example.com/Foo_(bar_(baz))",
    description: "Nested (example)",
  },
  {
    name: "keeps a dash inside nested URL parentheses out of the description",
    line: "- [Foo](https://example.com/Foo_((bar)-baz))",
    title: "Foo",
    url: "https://example.com/Foo_((bar)-baz)",
  },
  {
    name: "preserves legacy URLs with an unmatched opening parenthesis",
    line: "- [Search](https://example.com/search?q=f(x)",
    title: "Search",
    url: "https://example.com/search?q=f(x",
  },
  {
    name: "keeps a description ending in a parenthesis out of a legacy URL",
    line: "- [Search](https://example.com/search?q=f(x) - test :)",
    title: "Search",
    url: "https://example.com/search?q=f(x",
    description: "test :)",
  },
];

for (const { name, line, title, url, description } of cases) {
  test(name, () => {
    assert.deepEqual(parseBookmarks(line).rootBookmarks, [{ title, url, description, line: 1 }]);
  });
}
