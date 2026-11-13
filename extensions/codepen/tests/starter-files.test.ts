import assert from "node:assert/strict";
import test from "node:test";
import { starterFiles } from "../src/lib/starter-files";

test("custom Pens link supplied source files and escape their document title", () => {
  const files = starterFiles({
    title: "<Hello> & World",
    html: "<main>Demo</main>",
    css: "body { color: red; }",
    js: 'console.log("hello")',
  });
  assert.equal(files.length, 3);
  assert.match(files[0].content, /<title>&lt;Hello&gt; &amp; World<\/title>/);
  assert.match(files[0].content, /href="\/style.css"/);
  assert.match(files[0].content, /type="module" src="\/script.js"/);
  assert.equal(files[1].content, "body { color: red; }");
});

test("blank optional panels do not create empty files or broken references", () => {
  const files = starterFiles({ title: "HTML only", html: "<h1>Hi</h1>", css: "  ", js: "" });
  assert.equal(files.length, 1);
  assert.doesNotMatch(files[0].content, /style.css|script.js/);
  assert.match(files[0].content, /<h1>Hi<\/h1>/);
});
