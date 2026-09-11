const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function loadSource(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, "../src", file), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected runtime dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

const { iconKeywords } = loadSource("icon-keywords.ts");
const { filterIcons } = loadSource("search-icons.ts", { "./icon-keywords": { iconKeywords } });
const sdk = fs.readFileSync(require.resolve("@raycast/api/types/index.d.ts"), "utf8");
const entries = [...sdk.match(/enum Icon \{([\s\S]*?)\n\}/)[1].matchAll(/(\w+) = "([^"]+)"/g)].map(
  ([, name, value]) => [name, value],
);
const names = (query) => filterIcons(entries, query).map(([name]) => name);

test("covers every SDK icon and preserves numbered icon aliases", () => {
  for (const [name, value] of entries) {
    assert.ok(Array.isArray(iconKeywords[value]), name);
    if (/^number-\d+-16$/.test(value)) assert.equal(iconKeywords[value].length, 0);
    else assert.ok(iconKeywords[value].length > 0, name);
  }
});

test("finds semantic aliases, variants, and renamed SDK icons", () => {
  for (const [query, name] of [
    ["email", "Envelope"],
    ["settings", "Cog"],
    ["flight", "Airplane"],
    ["flight", "AirplaneFilled"],
    ["attachment", "Paperclip"],
    ["conversation", "Bubble"],
    ["mute", "MicrophoneDisabled"],
  ])
    assert.ok(names(query).includes(name), `${query} should find ${name}`);
});

test("preserves name substring search and handles case and whitespace", () => {
  assert.ok(names("Airplane").includes("Airplane"));
  assert.ok(names("  EMAIL  ").includes("Envelope"));
  assert.strictEqual(filterIcons(entries, ""), entries);
  assert.strictEqual(filterIcons(entries, "   "), entries);
  assert.equal(names("no-such-icon-xyz").length, 0);
});

test("unknown future icons retain name search without throwing", () => {
  const future = [["FutureIcon", "future-icon-16"]];
  assert.equal(filterIcons(future, "future").length, 1);
  assert.equal(filterIcons(future, "email").length, 0);
});
