const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { fileURLToPath, pathToFileURL } = require("node:url");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
let animateCharacters = true;
let currentHooks;
const react = {
  useMemo: (factory) => factory(),
  useState(initialValue) {
    const hooks = currentHooks;
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = initialValue;
    return [hooks.values[index], (update) => (hooks.values[index] = update(hooks.values[index]))];
  },
};
const api = {
  environment: { assetsPath: path.join(root, "assets") },
  getPreferenceValues: () => ({ animateCharacters }),
  Action: Object.assign(() => {}, {
    OpenInBrowser: "OpenInBrowser",
    Push: "Push",
    CopyToClipboard: "CopyToClipboard",
  }),
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
    if (id === "react") return react;
    if (!id.startsWith(".")) return require(id);
    const base = path.resolve(path.dirname(file), id);
    return load([`${base}.ts`, `${base}.tsx`].find(fs.existsSync));
  };
  new Function("require", "module", "exports", outputText)(localRequire, mod, mod.exports);
  return mod.exports;
}
const { CHARACTERS } = load(path.join(root, "src/data/characters.ts"));
const { CharacterDetail } = load(path.join(root, "src/components/CharacterDetail.tsx"));
function mountDetail(character, animated = true) {
  const hooks = { values: [], index: 0 };
  return () => {
    animateCharacters = animated;
    currentHooks = hooks;
    hooks.index = 0;
    return CharacterDetail({ character });
  };
}
const markdown = (character, animated = true) => mountDetail(character, animated)().props.markdown;
const animationAction = (detail) => detail.props.actions.props.children[2]?.props?.children;

function portraitPath(text) {
  const image = text.match(/!\[[^\n]+\]\((file:\/\/[^\n]+)\?raycast-width=/);
  assert.ok(image, "a portrait must use a local file URL");
  return fileURLToPath(image[1]);
}
const portraitSvg = (text) => fs.readFileSync(portraitPath(text), "utf8");

test("all 11 profiles use bundled vector illustrations with independently moving parts", () => {
  assert.equal(CHARACTERS.length, 11);
  for (const character of CHARACTERS) {
    assert.equal(fs.readFileSync(character.icon).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    const detail = mountDetail(character)();
    assert.equal(portraitPath(detail.props.markdown), path.join(root, "assets", "animated", `${character.id}.svg`));
    assert.ok(detail.props.markdown.length < 10000, "keep embedded image bytes out of Raycast Markdown");
    const svg = portraitSvg(detail.props.markdown);
    assert.ok(!svg.includes("<image"), "animation must move vector parts, not a raster portrait");
    assert.ok(svg.includes('data-part="'));
    if (!character.id.endsWith("yoroi-san")) assert.ok(svg.includes('data-part="eyes"'));
    assert.ok(svg.includes("<animateTransform"));
    assert.ok(svg.includes('repeatCount="indefinite"'));
    assert.ok(!svg.includes("file://"));
    assert.ok(!svg.includes(character.icon));
    assert.ok(detail.props.markdown.includes(character.description));
    assert.ok(detail.props.markdown.includes("## Relationships"));
    assert.ok(detail.props.markdown.includes("## Fun Facts"));
    assert.equal(detail.props.navigationTitle, character.nameEn);
    assert.ok(detail.props.actions);
    const copySection = detail.props.actions.props.children[1];
    const copiedMarkdown = copySection.props.children[2].props.content;
    assert.ok(!copiedMarkdown.includes("!["));
    assert.ok(!copiedMarkdown.includes("file://"));
    assert.ok(!copiedMarkdown.includes("data:image"));
    assert.ok(!copiedMarkdown.includes(character.icon));
    assert.equal(copiedMarkdown, detail.props.markdown.replace(/!\[[^\n]+\]\([^\n]+\)\n\n/, ""));
  }
});

test("disabling animation restores the original PNG for every character", () => {
  for (const character of CHARACTERS) {
    const detail = mountDetail(character, false)();
    assert.ok(detail.props.markdown.includes(pathToFileURL(character.icon).href));
    assert.ok(!detail.props.markdown.includes("data:image/svg"));
    assert.equal(animationAction(detail).props.title, "Show Animated Character");
  }
});

test("the portrait action switches between animated and still images without changing the profile", () => {
  for (const initiallyAnimated of [true, false]) {
    const render = mountDetail(CHARACTERS[0], initiallyAnimated);
    const initial = render();
    animationAction(initial).props.onAction();
    const toggled = render();
    assert.equal(path.extname(portraitPath(toggled.props.markdown)), initiallyAnimated ? ".png" : ".svg");
    assert.ok(toggled.props.markdown.includes(CHARACTERS[0].description));
    animationAction(toggled).props.onAction();
    assert.equal(render().props.markdown, initial.props.markdown);
  }
});

test("missing animated artwork falls back to the original portrait", () => {
  const character = { ...CHARACTERS[0], id: "missing-character" };
  assert.equal(portraitPath(markdown(character)), character.icon);
});

test("animated artwork still works when the original portrait is missing", () => {
  assert.equal(path.extname(portraitPath(markdown({ ...CHARACTERS[0], icon: "" }))), ".svg");
});

test("animation can be restored when the original portrait is unavailable", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chiikawa-unreadable-"));
  const unreadable = path.join(dir, "unreadable.png");
  fs.copyFileSync(CHARACTERS[0].icon, unreadable);
  const { accessSync } = fs;
  t.mock.method(fs, "accessSync", (source, mode) => {
    if (source === unreadable) throw Object.assign(new Error("Permission denied"), { code: "EACCES" });
    return accessSync(source, mode);
  });
  try {
    const inputs = [
      ["absent", undefined],
      ["empty path", ""],
      ["nonexistent", path.join(dir, "missing.png")],
      ["directory", dir],
      ["unreadable", unreadable],
    ];
    for (const [label, icon] of inputs) {
      for (const initiallyAnimated of [true, false]) {
        await t.test(`${label} PNG, animation initially ${initiallyAnimated ? "on" : "off"}`, () => {
          const character = { ...CHARACTERS[0], icon };
          const render = mountDetail(character, initiallyAnimated);
          const copiedMarkdown = mountDetail(CHARACTERS[0])().props.actions.props.children[1].props.children[2].props
            .content;
          for (const animated of [initiallyAnimated, !initiallyAnimated, initiallyAnimated]) {
            const detail = render();
            const action = animationAction(detail);
            assert.ok(action, "keep the animation action available when the SVG exists");
            assert.equal(action.props.title, animated ? "Show Original Portrait" : "Show Animated Character");
            if (animated) {
              assert.equal(
                portraitPath(detail.props.markdown),
                path.join(root, "assets", "animated", `${character.id}.svg`),
              );
            } else {
              assert.ok(!detail.props.markdown.includes("!["), "respect animation-off when the PNG is unavailable");
            }
            assert.equal(detail.props.markdown.replace(/!\[[^\n]+\]\([^\n]+\)\n\n/, ""), copiedMarkdown);
            const copyActions = detail.props.actions.props.children[1].props.children;
            assert.equal(copyActions[1].props.content, character.description);
            assert.equal(copyActions[2].props.content, copiedMarkdown);
            action.props.onAction();
          }
        });
      }
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("missing, absent, or unreadable images omit the image and animation action without losing the biography", () => {
  for (const icon of [undefined, "", path.join(root, "assets", "missing.png"), path.join(root, "assets")]) {
    for (const animated of [true, false]) {
      const detail = mountDetail({ ...CHARACTERS[0], id: "missing-character", icon }, animated)();
      const text = detail.props.markdown;
      assert.ok(!text.includes("!["));
      assert.ok(!text.includes("undefined"));
      assert.ok(text.includes(CHARACTERS[0].description));
      assert.equal(animationAction(detail), undefined);
      const copyActions = detail.props.actions.props.children[1].props.children;
      assert.equal(copyActions[1].props.content, CHARACTERS[0].description);
      assert.equal(copyActions[2].props.content, text);
    }
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
    assert.ok(markdown({ ...CHARACTERS[0], icon }, false).includes(pathToFileURL(icon).href));
    assert.ok(markdown({ ...CHARACTERS[0], icon }, false).includes("%20"));
    assert.ok(markdown({ ...CHARACTERS[0], icon }, false).includes("%23"));
    assert.ok(portraitSvg(markdown({ ...CHARACTERS[0], icon })).includes("<animateTransform"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
