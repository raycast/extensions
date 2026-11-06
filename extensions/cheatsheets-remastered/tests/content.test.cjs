const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("yaml");
const { createHash } = require("node:crypto");
const index = JSON.parse(fs.readFileSync("assets/cheatsheets/index.json", "utf8"));
const directory = "assets/cheatsheets";
const excluded = ["basic.md", "keywords_test.md", "packs.md", "polyfill.io.md"];
const replaced = ["bash.md", "jsdoc.md", "markdown.md", "python.md", "tar.md", "vim-digraphs.md"];

test("bundled index has no missing, duplicate or excluded sheets", () => {
  assert.equal(new Set(index.map((row) => row.path)).size, index.length);
  for (const row of index) assert.ok(fs.existsSync(path.join(directory, row.path)), row.path);
  for (const file of excluded) {
    assert.ok(!fs.existsSync(path.join(directory, file)), file);
    assert.ok(!index.some((row) => row.path === file), file);
  }
});

test("restored editions retain their precise source revision and matching titles", () => {
  for (const file of replaced) {
    const row = index.find((entry) => entry.path === file);
    assert.equal(row.sourceRevision, "bf059536c6403deadd404b25320df2dc4608537d");
    const source = fs.readFileSync(path.join(directory, file), "utf8");
    const metadata = yaml.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]);
    assert.equal(row.title, metadata.title, file);
  }
  const license = fs.readFileSync("assets/DEVHINTS-LICENSE.txt");
  assert.equal(
    createHash("sha256").update(license).digest("hex"),
    "a7be34d877bcce490df1eb2cf363a9a63aa5438df1cc95d2217ed37e4448d2fa",
  );
});

test("bundled Markdown has no links to excluded local sheets or retired CDN loaders", () => {
  for (const file of fs.readdirSync(directory).filter((file) => file.endsWith(".md"))) {
    const source = fs.readFileSync(path.join(directory, file), "utf8");
    assert.doesNotMatch(source, /(?:https?:)?\/\/(?:cdn\.)?polyfill\.io\//i, file);
    const links = [...source.matchAll(/\]\(([^)]+)\)|^\[[^\]]+\]:\s*(\S+)/gm)].map((match) => match[1] || match[2]);
    for (const link of links) {
      if (/^(?:https?:|#)/.test(link)) continue;
      const name = link.split(/[?#]/)[0].replace(/^\.\//, "").replace(/^\//, "").replace(/\.md$/, "");
      assert.ok(!excluded.includes(name + ".md"), `${file}: ${link}`);
    }
  }
});
