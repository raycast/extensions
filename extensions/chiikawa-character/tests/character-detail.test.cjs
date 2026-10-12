const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const api = {
  environment: { assetsPath: path.join(root, "assets") },
  Action: { OpenInBrowser: "OpenInBrowser", Push: "Push", CopyToClipboard: "CopyToClipboard" },
  ActionPanel: Object.assign(() => {}, { Section: "Section" }),
  Detail: Object.assign(() => {}, {
    Metadata: Object.assign(() => {}, { TagList: Object.assign(() => {}, { Item: "Item" }) }),
  }),
  Icon: {},
  Keyboard: { Shortcut: { Common: { Copy: {} } } },
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: file,
  });
  const localRequire = (id) => {
    if (id === "@raycast/api") return api;
    if (!id.startsWith(".")) return require(id);
    const base = path.resolve(path.dirname(file), id);
    return load([`${base}.ts`, `${base}.tsx`].find(fs.existsSync));
  };
  new Function("require", "module", "exports", outputText)(localRequire, mod, mod.exports);
  return mod.exports;
}
const { CHARACTERS } = load(path.join(root, "src/data/characters.ts"));
const { CharacterDetail } = load(path.join(root, "src/components/CharacterDetail.tsx"));
const markdown = (character) => CharacterDetail({ character }).props.markdown;

test("all 11 profiles render their existing bundled PNG and retain profile content and actions", () => {
  assert.equal(CHARACTERS.length, 11);
  for (const character of CHARACTERS) {
    assert.equal(fs.readFileSync(character.icon).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    const detail = CharacterDetail({ character });
    assert.ok(detail.props.markdown.includes(`![${character.nameEn}](${pathToFileURL(character.icon).href}?`));
    assert.ok(detail.props.markdown.includes(character.description));
    assert.ok(detail.props.markdown.includes("## Relationships"));
    assert.ok(detail.props.markdown.includes("## Fun Facts"));
    assert.equal(detail.props.navigationTitle, character.nameEn);
    assert.ok(detail.props.actions);
    const copySection = detail.props.actions.props.children[1];
    assert.equal(copySection.props.children[2].props.content, detail.props.markdown);
  }
});

test("missing or absent images omit the image without losing the biography", () => {
  for (const icon of [undefined, "", path.join(root, "assets", "missing.png")]) {
    const text = markdown({ ...CHARACTERS[0], icon });
    assert.ok(!text.includes("!["));
    assert.ok(!text.includes("undefined"));
    assert.ok(text.includes(CHARACTERS[0].description));
  }
});

test("optional catchphrases remain conditional with and without an image", () => {
  for (const icon of [CHARACTERS[0].icon, undefined]) {
    for (const catchphrases of [undefined, []]) {
      assert.ok(!markdown({ ...CHARACTERS[0], icon, catchphrases }).includes("## Catchphrases"));
    }
    assert.ok(markdown({ ...CHARACTERS[0], icon, catchphrases: ["Yaha!"] }).includes("## Catchphrases\n- Yaha!"));
  }
});

test("local image URLs encode spaces and markdown punctuation in asset paths", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chiikawa images "));
  try {
    const icon = path.join(dir, "character (#1).png");
    fs.copyFileSync(CHARACTERS[0].icon, icon);
    assert.ok(markdown({ ...CHARACTERS[0], icon }).includes(pathToFileURL(icon).href));
    assert.ok(markdown({ ...CHARACTERS[0], icon }).includes("%20"));
    assert.ok(markdown({ ...CHARACTERS[0], icon }).includes("%23"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
