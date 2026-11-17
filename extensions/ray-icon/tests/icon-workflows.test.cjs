const assert = require("node:assert/strict");
const { test, after } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createHash } = require("node:crypto");
const { fileURLToPath } = require("node:url");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { create, act } = require("react-test-renderer");
const { Resvg } = require("@resvg/resvg-wasm");

const root = path.resolve(__dirname, "..");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "ray-icon-test-"));
const exported = path.join(temporary, "Exports with # spaces (test)");
const navigation = { pushed: [], pops: 0 };
const host = (name) => (props) => React.createElement(name, props, props.children);
const List = host("List");
List.Item = host("List.Item");
List.Item.Detail = host("List.Item.Detail");
List.Item.Detail.Metadata = host("Metadata");
List.Item.Detail.Metadata.Label = host("Label");
List.Item.Detail.Metadata.TagList = host("TagList");
List.Item.Detail.Metadata.TagList.Item = host("Tag");
const Action = host("Action");
const ActionPanel = host("ActionPanel");
ActionPanel.Section = host("ActionPanel.Section");
ActionPanel.Submenu = host("ActionPanel.Submenu");
const Grid = host("Grid");
Grid.Item = host("Grid.Item");
Grid.Section = host("Grid.Section");
Grid.EmptyView = host("Grid.EmptyView");
Grid.Dropdown = host("Grid.Dropdown");
Grid.Dropdown.Item = host("Grid.Dropdown.Item");
Grid.Inset = { Zero: "zero" };
Action.Style = { Destructive: "destructive" };
Action.Push = host("Action.Push");
Action.SubmitForm = host("Action.SubmitForm");
const Form = host("Form");
Form.TextField = host("Form.TextField");
const api = {
  environment: {
    assetsPath: path.join(root, "assets"),
    supportPath: path.join(temporary, "support"),
  },
  getPreferenceValues: () => ({ exportDirectory: exported }),
  List,
  Action,
  ActionPanel,
  Grid,
  Form,
  Alert: { ActionStyle: { Destructive: "destructive" } },
  showToast: async () => ({}),
  Toast: { Style: { Success: "success", Failure: "failure", Animated: "animated" } },
  Icon: new Proxy({}, { get: (_, key) => key }),
  Keyboard: { Shortcut: { Common: { Edit: { modifiers: ["cmd"], key: "e" } } } },
  useNavigation: () => ({ push: (element) => navigation.pushed.push(element), pop: () => navigation.pops++ }),
};
const originalLoad = Module._load;
Module._load = function (id, parent, isMain) {
  if (id.startsWith(".") && !path.extname(id) && parent?.filename) {
    const base = path.resolve(path.dirname(parent.filename), id);
    for (const extension of [".ts", ".tsx"]) {
      if (fs.existsSync(base + extension)) return originalLoad.call(this, base + extension, parent, isMain);
    }
  }
  if (id === "@raycast/api") return api;
  if (id === "@raycast/utils")
    return {
      useCachedState: (_key, initial) => React.useState(initial),
      usePromise(fn, args) {
        const [state, setState] = React.useState({ isLoading: true });
        React.useEffect(() => {
          let active = true;
          fn(...args).then(
            (data) => {
              if (active) setState({ data, isLoading: false });
            },
            (error) => {
              if (active) setState({ error, isLoading: false });
            },
          );
          return () => {
            active = false;
          };
        }, args);
        return state;
      },
    };
  return originalLoad.call(this, id, parent, isMain);
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (compiled, filename) => {
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2023,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    compiled._compile(outputText, filename);
  };
}

const { DEFAULT_SETTINGS, PRESETS, applyPreset } = require("../src/lib/settings.ts");
const { applyAppearance, luminance } = require("../src/lib/appearance.ts");
const { fileUrl, imageMarkdown } = require("../src/lib/preview.ts");
const { exportPng, exportSvg, parseCustomSvg, previewFile, previewPng, renderPng } = require("../src/lib/render.ts");
const { resolveIconName } = require("../src/lib/icons.ts");
const createIcon = require("../src/tools/create-icon.ts").default;
const { IconEditor } = require("../src/components/IconEditor.tsx");
const previewCache = path.join(
  os.tmpdir(),
  "ray-icon-previews",
  createHash("sha256").update(api.environment.supportPath).digest("hex"),
);

after(() => {
  Module._load = originalLoad;
  fs.rmSync(previewCache, { recursive: true, force: true });
  fs.rmSync(temporary, { recursive: true, force: true });
});

test("appearance adapts every preset and retains glyph geometry with readable colors", () => {
  for (let index = 0; index < PRESETS.length; index++) {
    const original = { ...applyPreset(DEFAULT_SETTINGS, index), icon: "moon", iconSize: 288, iconOffsetX: 12 };
    const unchanged = structuredClone(original);
    for (const appearance of ["light", "dark"]) {
      const result = applyAppearance(original, appearance);
      assert.equal(result.icon, "moon");
      assert.equal(result.iconSize, 288);
      assert.equal(result.iconOffsetX, 12);
      for (const color of [result.backgroundStartColor, result.backgroundEndColor]) {
        const brightness = luminance(color);
        assert(appearance === "light" ? brightness >= 0.65 : brightness <= 0.12);
        const glyph = luminance(result.iconColor);
        assert((Math.max(glyph, brightness) + 0.05) / (Math.min(glyph, brightness) + 0.05) >= 4.5);
      }
    }
    assert.deepEqual(original, unchanged);
  }
});

test("already suitable explicit colors remain unchanged", () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    backgroundStartColor: "#111111",
    backgroundEndColor: "#222222",
    iconColor: "#ffffff",
  };
  const dark = applyAppearance(settings, "dark");
  assert.equal(dark.backgroundStartColor, settings.backgroundStartColor);
  assert.equal(dark.backgroundEndColor, settings.backgroundEndColor);
  assert.equal(dark.iconColor, settings.iconColor);
});

test("light, dark, both, and omitted requests export exactly the requested variants", async () => {
  for (const appearance of [undefined, "light", "dark", "both"]) {
    const result = await createIcon({ icon: "rocket", appearance, fileName: "rocket.png", pngSize: 64 });
    const expected = appearance === "both" ? ["light", "dark"] : [appearance ?? "default"];
    assert.deepEqual(
      result.variants.map((variant) => variant.appearance),
      expected,
    );
    assert.deepEqual(structuredClone(result), result);
    for (const variant of result.variants) {
      const png = fs.readFileSync(variant.pngPath);
      assert.equal(png.subarray(1, 4).toString(), "PNG");
      assert.equal(png.readUInt32BE(16), 64);
      assert.equal(png.readUInt32BE(20), 64);
      assert(fs.readFileSync(variant.svgPath, "utf8").includes("<svg"));
      assert(variant.preview.startsWith("!["));
      assert(variant.downloads.includes(fileUrl(variant.pngPath)));
      assert(!variant.pngPath.includes(".png_light"));
      if (appearance) assert(variant.pngPath.includes(`_${variant.appearance}`));
      else assert.equal(variant.settings.backgroundStartColor, DEFAULT_SETTINGS.backgroundStartColor);
    }
    if (appearance === "both") {
      const [light, dark] = result.variants;
      assert.notEqual(light.pngPath, dark.pngPath);
      assert.notEqual(light.settings.backgroundStartColor, dark.settings.backgroundStartColor);
      assert.equal(light.settings.icon, dark.settings.icon);
      assert.equal(result.preview.split("![").length - 1, 2);
    }
  }
});

test("paired custom SVGs preserve the glyph and omit unsupported ray.so links", async () => {
  const customSvg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor"/></svg>';
  const result = await createIcon({ customSvg, appearance: "both", pngSize: 64 });
  for (const variant of result.variants) {
    assert.equal(variant.raySoUrl, undefined);
    assert(fs.readFileSync(variant.svgPath, "utf8").includes('<circle cx="12"'));
  }
});

test("invalid appearance fails before exporting files", async () => {
  const before = fs.readdirSync(exported);
  await assert.rejects(createIcon({ icon: "rocket", appearance: "sepia" }), /appearance must be/);
  assert.deepEqual(fs.readdirSync(exported), before);
});

test("Markdown file URLs survive spaces, fragments, parentheses, and Unicode", () => {
  const target = path.join(exported, "café (light)#1.png");
  const url = fileUrl(target);
  assert.equal(fileURLToPath(url), target);
  assert(!url.includes(" "));
  assert(!url.includes("#"));
  assert(!url.includes("("));
  assert.equal(imageMarkdown(target, "Light Icon"), `![Light Icon](${url})`);
});

test("previews use disposable cache storage and remove legacy permanent previews", async () => {
  const legacy = path.join(api.environment.supportPath, "previews");
  fs.mkdirSync(legacy, { recursive: true });
  fs.writeFileSync(path.join(legacy, "old.svg"), "old preview");
  const png = await previewPng(DEFAULT_SETTINGS);
  const svg = previewFile(DEFAULT_SETTINGS);
  for (const file of [png, svg]) {
    assert.equal(path.dirname(file), previewCache);
    assert(fs.existsSync(file));
  }
  assert(!fs.existsSync(legacy));
});

test("custom SVG root presentation survives preview and PNG/SVG export", async () => {
  const glyph = '<path d="M4 12h16M12 4v16"/>';
  const presentation =
    'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.65"';
  for (const viewport of ['viewBox="0 0 24 24" width="48" height="48"', "width='24' height='24'"]) {
    const settings = {
      ...DEFAULT_SETTINGS,
      fileName: "root-stroke",
      customSvg: `<svg ${viewport} ${presentation}>${glyph}</svg>`,
    };
    const reference = {
      ...settings,
      customSvg: `<svg viewBox="0 0 24 24"><path ${presentation} d="M4 12h16M12 4v16"/></svg>`,
    };
    assert.equal(parseCustomSvg(settings.customSvg).viewBox, "0 0 24 24");
    const expected = await renderPng(reference, 64);
    assert.deepEqual(fs.readFileSync(await exportPng(settings, 64)), expected);
    assert.notDeepEqual(expected, await renderPng({ ...settings, customSvg: '<svg viewBox="0 0 24 24"></svg>' }, 64));
    assert.deepEqual(fs.readFileSync(await previewPng(settings)), await renderPng(reference, 320));
    for (const file of [exportSvg(settings), previewFile(settings)]) {
      const renderer = new Resvg(fs.readFileSync(file, "utf8"), { fitTo: { mode: "width", value: 64 } });
      const image = renderer.render();
      try {
        assert.deepEqual(Buffer.from(image.asPng()), expected);
      } finally {
        image.free();
        renderer.free();
      }
    }
  }

  const filled = {
    ...DEFAULT_SETTINGS,
    customSvg: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>',
  };
  const reference = {
    ...filled,
    customSvg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>',
  };
  assert.deepEqual(await renderPng(filled, 64), await renderPng(reference, 64));
});

test("overlapping PNG exports keep separate files and their rendered contents", async () => {
  const settings = ["rocket", "moon", "sun"].map((icon) => ({
    ...DEFAULT_SETTINGS,
    icon,
    fileName: "overlapping.png",
  }));
  const files = await Promise.all(settings.map((value) => exportPng(value, 64)));
  assert.equal(new Set(files).size, settings.length);
  for (let index = 0; index < settings.length; index++) {
    assert.deepEqual(fs.readFileSync(files[index]), await renderPng(settings[index], 64));
  }
});

test("exports retry an exclusively occupied filename and propagate other write failures", async (t) => {
  const originalWrite = fs.writeFileSync;
  const occupied = path.join(exported, "exclusive.svg");
  const denied = path.join(exported, "denied.svg");
  t.mock.method(fs, "writeFileSync", (file, content, options) => {
    if (file === occupied && !fs.existsSync(occupied)) originalWrite(occupied, "another writer");
    if (file === denied) throw Object.assign(new Error("permission denied"), { code: "EACCES" });
    return originalWrite(file, content, options);
  });
  const saved = exportSvg({ ...DEFAULT_SETTINGS, fileName: "exclusive" });
  assert.equal(saved, path.join(exported, "exclusive-2.svg"));
  assert.equal(fs.readFileSync(occupied, "utf8"), "another writer");
  assert.match(fs.readFileSync(saved, "utf8"), /<svg/);
  assert.throws(() => exportSvg({ ...DEFAULT_SETTINGS, fileName: "denied" }), /permission denied/);
});

test("prototype keys return the unknown-icon error before exporting", async () => {
  const before = fs.readdirSync(exported);
  for (const name of ["constructor", "__proto__", "hasOwnProperty", "toString"]) {
    assert.equal(resolveIconName(name), undefined);
    await assert.rejects(createIcon({ icon: name, pngSize: 64 }), /Unknown icon/);
  }
  assert.deepEqual(fs.readdirSync(exported), before);
  assert.equal(resolveIconName("Rocket Icon"), "rocket");
  assert.equal(resolveIconName("CloudSunIcon"), "cloud-sun");
});

test("SVG and PNG previews prune old entries while retaining recently reused files", async () => {
  const recentPng = await previewPng(DEFAULT_SETTINGS);
  const recentSvg = previewFile(DEFAULT_SETTINGS);
  const dir = path.dirname(recentPng);
  const stale = new Date(1980, 0, 1);
  for (const file of [recentPng, recentSvg]) fs.utimesSync(file, stale, stale);
  assert.equal(await previewPng(DEFAULT_SETTINGS), recentPng);
  assert.equal(previewFile(DEFAULT_SETTINGS), recentSvg);
  let index = 0;
  for (const extension of ["svg", "png"]) {
    const seeded = [];
    while (fs.readdirSync(dir).length < 1024) {
      const file = path.join(dir, `${(index++).toString(16).padStart(64, "0")}.${index % 2 ? "svg" : "png"}`);
      fs.writeFileSync(file, "old preview");
      const old = new Date(seeded.length === 0 ? 1990 : 2000, 0, 1, 0, 0, index);
      fs.utimesSync(file, old, old);
      seeded.push(file);
    }
    const settings = { ...DEFAULT_SETTINGS, iconOffsetY: extension === "svg" ? 13 : 17 };
    const current = extension === "svg" ? previewFile(settings) : await previewPng(settings);
    assert(fs.readdirSync(dir).length <= 1024);
    assert(!fs.existsSync(seeded[0]));
    for (const file of [current, recentSvg, recentPng]) assert(fs.existsSync(file));
    assert.equal(previewFile(DEFAULT_SETTINGS), recentSvg);
    assert.equal(await previewPng(DEFAULT_SETTINGS), recentPng);
  }
});

test("full preview changes for noise, border, and glyph and reuses identical renders", async () => {
  const original = await previewPng(DEFAULT_SETTINGS);
  assert.equal(await previewPng({ ...DEFAULT_SETTINGS }), original);
  for (const patch of [{ icon: "moon" }, { backgroundNoiseTexture: true }, { backgroundStrokeSize: 16 }]) {
    const changed = await previewPng({ ...DEFAULT_SETTINGS, ...patch });
    assert.notEqual(changed, original);
    assert.notDeepEqual(fs.readFileSync(changed), fs.readFileSync(original));
  }
});

test("editor previews browsed icons, applies the chosen draft, and previews toggles", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let editor, picker, applied;
  await act(async () => {
    editor = create(
      React.createElement(IconEditor, {
        settings: DEFAULT_SETTINGS,
        onSubmit: (value) => {
          applied = value;
        },
      }),
    );
  });
  const row = (title) => editor.root.findAllByType("List.Item").find((item) => item.props.title === title);
  await act(async () => {
    row("Icon").props.actions.props.children[0].props.onAction();
  });
  await act(async () => {
    picker = create(navigation.pushed.at(-1));
  });
  await act(async () => {
    picker.root.findByType("List").props.onSelectionChange("moon");
  });
  const expected = imageMarkdown(await previewPng({ ...DEFAULT_SETTINGS, icon: "moon" }), "Icon", 320);
  const moon = picker.root.findAllByType("List.Item").find((item) => item.props.id === "moon");
  assert.equal(moon.props.detail.props.markdown, expected);
  assert.equal(applied, undefined);
  await act(async () => {
    moon.props.actions.props.children.props.onAction();
  });
  assert.equal(row("Icon").props.accessories[0].text, "Moon");
  const previous = row("Noise").props.detail.props.markdown;
  await act(async () => {
    row("Noise").props.actions.props.children[0].props.onAction();
  });
  assert.notEqual(row("Noise").props.detail.props.markdown, previous);
  await act(async () => {
    row("Icon").props.actions.props.children[1].props.onAction();
  });
  assert.equal(applied.icon, "moon");
  assert.equal(applied.backgroundNoiseTexture, true);
  assert.equal(DEFAULT_SETTINGS.icon, "rocket");
  await act(async () => {
    picker.unmount();
    editor.unmount();
  });
});

test("editor hides metadata by default and edits colors, fill, and file name from the list", async (t) => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const views = [];
  t.after(async () => {
    await act(async () => views.forEach((view) => view.unmount()));
  });
  let editor, applied;
  await act(async () => {
    editor = create(
      React.createElement(IconEditor, { settings: DEFAULT_SETTINGS, onSubmit: (value) => (applied = value) }),
    );
    views.push(editor);
  });
  const row = (title) => editor.root.findAllByType("List.Item").find((item) => item.props.title === title);
  const toggleMetadata = () =>
    row("Icon").props.actions.props.children.find((action) => action.props.title.endsWith("Preview Metadata"));
  assert.equal(row("Icon").props.detail.props.metadata, undefined);
  assert(row("Icon").props.detail.props.markdown.includes("raycast-width=320"));
  await act(async () => toggleMetadata().props.onAction());
  assert(row("Icon").props.detail.props.metadata);
  assert(row("Icon").props.detail.props.markdown.includes("raycast-width=200"));
  await act(async () => toggleMetadata().props.onAction());
  assert.equal(row("Icon").props.detail.props.metadata, undefined);

  const openField = async (title) => {
    await act(async () => row(title).props.actions.props.children[0].props.onAction());
    let view;
    await act(async () => {
      view = create(navigation.pushed.at(-1));
      views.push(view);
    });
    return view;
  };
  const submitField = async (view, value) => {
    await act(async () => view.root.findByType("Form").props.actions.props.children.props.onSubmit({ value }));
  };
  const previousPreview = row("Icon").props.detail.props.markdown;
  const color = await openField("Start Color");
  await submitField(color, "not-a-color");
  assert.match(color.root.findByType("Form.TextField").props.error, /hex color/);
  assert.equal(row("Start Color").props.accessories[0].text, DEFAULT_SETTINGS.backgroundStartColor);
  await submitField(color, " #FF8800 ");
  assert.equal(row("Start Color").props.accessories[0].text, "#FF8800");
  assert.equal(row("Start Color").props.icon.tintColor, "#FF8800");
  assert.equal(row("Preset").props.accessories[0].text, "Custom");
  assert.notEqual(row("Icon").props.detail.props.markdown, previousPreview);

  const fill = await openField("Fill");
  await act(async () => fill.root.findByType("List").props.onSelectionChange("Solid"));
  const solid = fill.root.findAllByType("List.Item").find((item) => item.props.id === "Solid");
  await act(async () => solid.props.actions.props.children.props.onAction());
  assert.equal(row("Fill").props.accessories[0].text, "Solid");
  assert.equal(row("Background Color").props.accessories[0].text, "#FF8800");
  assert.equal(row("End Color"), undefined);
  assert.equal(row("Icon Color").props.accessories[0].text, DEFAULT_SETTINGS.iconColor);

  const fileName = await openField("File Name");
  await submitField(fileName, " ");
  assert.match(fileName.root.findByType("Form.TextField").props.error, /file name/);
  await submitField(fileName, "my_icon");
  assert.equal(row("File Name").props.accessories[0].text, "my_icon");
  assert.equal(applied, undefined);
  await act(async () => row("Icon").props.actions.props.children[1].props.onAction());
  assert.equal(applied.backgroundStartColor, "#FF8800");
  assert.equal(applied.backgroundEndColor, DEFAULT_SETTINGS.backgroundEndColor);
  assert.equal(applied.backgroundFillType, "Solid");
  assert.equal(applied.fileName, "my_icon");
  assert.equal(applied.icon, DEFAULT_SETTINGS.icon);
});

const libraryStore = require("../src/lib/library.ts");
const listLibrary = require("../src/tools/list-library.ts").default;
const saveLibraryItem = require("../src/tools/save-library-item.ts").default;
const { IconBrowser } = require("../src/components/IconBrowser.tsx");
const { LibraryActions } = require("../src/components/LibraryActions.tsx");

function resetLibrary() {
  fs.rmSync(libraryStore.libraryDirectory(), { recursive: true, force: true });
}

test("history persists full settings and deduplicates re-exports without resetting favorites", () => {
  resetLibrary();
  const settings = { ...DEFAULT_SETTINGS, fileName: "First Name", backgroundNoiseTexture: true };
  const first = libraryStore.recordHistory(settings);
  const favorite = libraryStore.setFavorite(settings, true);
  const second = libraryStore.recordHistory({ ...settings, fileName: "New Name", selectedPresetIndex: null });
  const fresh = libraryStore.readLibrary();
  assert.equal(fresh.history.length, 1);
  assert.equal(first.id, second.id);
  assert.equal(first.createdAt, second.createdAt);
  assert(second.updatedAt > first.updatedAt);
  assert.equal(fresh.history[0].name, "New Name");
  assert.equal(fresh.history[0].settings.backgroundNoiseTexture, true);
  assert.deepEqual(fresh.favorites[0].settings, JSON.parse(JSON.stringify(favorite.settings)));
  assert.equal(fresh.favorites[0].name, "First Name");
});

test("history keeps the latest 100 designs and trimming/removal preserves favorites and templates", () => {
  resetLibrary();
  const first = libraryStore.recordHistory(DEFAULT_SETTINGS);
  libraryStore.setFavorite(DEFAULT_SETTINGS, true);
  const template = libraryStore.saveTemplate(DEFAULT_SETTINGS, "Keep This Style");
  for (let i = 1; i <= libraryStore.HISTORY_LIMIT; i++) {
    libraryStore.recordHistory({ ...DEFAULT_SETTINGS, iconOffsetX: i, fileName: `Version ${i}` });
  }
  const fresh = libraryStore.readLibrary();
  assert.equal(fresh.history.length, 100);
  assert.equal(fresh.history[0].name, "Version 100");
  assert(!fresh.history.some((item) => item.id === first.id));
  assert.equal(fresh.favorites[0].id, first.id);
  assert(fresh.templates.some((item) => item.id === template.id));
  libraryStore.removeLibraryItem("history", fresh.history[0].id);
  assert.equal(libraryStore.readLibrary().favorites.length, 1);
});

test("templates retain exact style, apply to another glyph, and rename/delete independently", () => {
  resetLibrary();
  const source = {
    ...DEFAULT_SETTINGS,
    customSvg: '<svg viewBox="0 0 10 10"><path d="M1 1H9V9H1Z"/></svg>',
    icon: undefined,
    backgroundRadius: 64,
    backgroundNoiseTexture: true,
    fileName: "Source",
  };
  const template = libraryStore.saveTemplate(source, "  Ocean Brand  ");
  assert.equal(template.name, "Ocean Brand");
  const target = { ...DEFAULT_SETTINGS, icon: "moon", fileName: "Moon Export" };
  const applied = libraryStore.applyTemplate(template, target);
  assert.equal(applied.icon, "moon");
  assert.equal(applied.customSvg, undefined);
  assert.equal(applied.fileName, "Moon Export");
  assert.equal(applied.backgroundRadius, 64);
  assert.equal(applied.backgroundNoiseTexture, true);
  assert.equal(libraryStore.renameTemplate(template.id, "Moon Brand").name, "Moon Brand");
  assert.throws(() => libraryStore.saveTemplate(source, "   "), /name/);
  assert.throws(() => libraryStore.renameTemplate("builtin-light", "Replace"), /built-in/);
  libraryStore.removeLibraryItem("templates", template.id);
  assert.equal(libraryStore.readLibrary().templates.length, 4);
});

test("AI-generated variants enter history, can be favorited, and can become templates without re-exporting", async () => {
  resetLibrary();
  const result = await createIcon({ icon: "rocket", appearance: "both", pngSize: 64 });
  assert.equal(libraryStore.readLibrary().history.length, 2);
  assert.notEqual(result.variants[0].historyId, result.variants[1].historyId);
  const before = fs.readdirSync(exported);
  const id = result.variants[0].historyId;
  assert(id);
  const saved = saveLibraryItem({ id, collection: "history", action: "favorite" });
  assert.equal(saved.collection, "favorites");
  const template = saveLibraryItem({ id, collection: "history", action: "template", name: "My Light Style" });
  assert.equal(libraryStore.getLibraryItem("templates", template.id).name, "My Light Style");
  assert.deepEqual(fs.readdirSync(exported), before);
  assert.equal(listLibrary({ collection: "favorites", query: "rocket" }).total, 1);
  saveLibraryItem({ id, collection: "favorites", action: "unfavorite" });
  assert.equal(listLibrary({ collection: "favorites" }).total, 0);
  assert.equal(listLibrary({ collection: "history" }).total, 2);
});

test("AI reuses templates and restores custom SVG history after exported files are deleted", async () => {
  resetLibrary();
  const style = { ...DEFAULT_SETTINGS, backgroundRadius: 64, iconSize: 224, backgroundStartColor: "#123456" };
  const template = libraryStore.saveTemplate(style, "Brand");
  const moon = await createIcon({ sourceId: template.id, sourceCollection: "templates", icon: "moon", pngSize: 64 });
  assert.equal(moon.settings.icon, "moon");
  assert.equal(moon.settings.backgroundRadius, 64);
  assert.equal(moon.settings.iconSize, 224);
  assert.equal(moon.settings.backgroundStartColor, "#123456");
  const customSvg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>';
  const original = await createIcon({ customSvg, pngSize: 64 });
  fs.rmSync(original.pngPath);
  fs.rmSync(original.svgPath);
  const restored = await createIcon({ sourceId: original.historyId, sourceCollection: "history", pngSize: 64 });
  assert(fs.readFileSync(restored.svgPath, "utf8").includes('<circle cx="12"'));
  assert.equal(restored.raySoUrl, undefined);
});

test("missing and unsafe source IDs fail before generating files", async () => {
  const before = fs.readdirSync(exported);
  await assert.rejects(
    createIcon({ sourceId: "../../outside", sourceCollection: "templates", icon: "moon" }),
    /Invalid saved icon ID/,
  );
  await assert.rejects(
    createIcon({ sourceId: "b".repeat(64), sourceCollection: "history", icon: "moon" }),
    /no longer exists/,
  );
  await assert.rejects(createIcon({ sourceId: "builtin-dark", icon: "moon" }), /both sourceId/);
  assert.deepEqual(fs.readdirSync(exported), before);
});

test("corrupt entries do not hide healthy saved items or get overwritten", () => {
  resetLibrary();
  libraryStore.recordHistory(DEFAULT_SETTINGS);
  const corrupt = path.join(libraryStore.libraryDirectory(), `history-${"b".repeat(64)}.json`);
  fs.writeFileSync(corrupt, "broken JSON");
  const result = libraryStore.readLibrary();
  assert.equal(result.history.length, 1);
  assert.equal(result.issues.length, 1);
  assert.equal(fs.readFileSync(corrupt, "utf8"), "broken JSON");
});

test("history failure preserves successful AI exports and reports a warning instead of prompting a retry", async () => {
  resetLibrary();
  const directory = libraryStore.libraryDirectory();
  fs.rmSync(directory, { recursive: true });
  fs.writeFileSync(directory, "unavailable");
  try {
    const result = await createIcon({ icon: "rocket", pngSize: 64 });
    assert.equal(result.historyId, undefined);
    assert.match(result.historyWarning, /exported successfully/);
    assert(fs.existsSync(result.pngPath));
    assert(fs.existsSync(result.svgPath));
  } finally {
    fs.rmSync(directory);
  }
});

test("collection modes show saved designs, templates apply to the icon browser, and favorites update immediately", async (t) => {
  resetLibrary();
  const style = { ...DEFAULT_SETTINGS, backgroundRadius: 64, backgroundStartColor: "#123456" };
  libraryStore.saveTemplate(style, "Brand Style");
  const history = libraryStore.recordHistory({ ...DEFAULT_SETTINGS, icon: "moon", fileName: "Recent Moon" });
  let browser;
  t.after(async () => {
    if (browser) await act(async () => browser.unmount());
  });
  await act(async () => {
    browser = create(React.createElement(IconBrowser, { initialMode: "templates" }));
  });
  const grid = () => browser.root.findByType("Grid");
  const tiles = () => browser.root.findAllByType("Grid.Item");
  assert.equal(grid().props.searchBarAccessory.props.value, "templates");
  const brand = tiles().find((item) => item.props.title === "Brand Style");
  await act(async () => {
    brand.props.actions.props.children[0].props.onAction();
  });
  assert.equal(grid().props.searchBarAccessory.props.value, "all");
  const moon = tiles().find((item) => item.props.title === "Moon");
  const preview = moon.props.actions.props.children[1].props.target.props.settings;
  assert.equal(preview.backgroundStartColor, "#123456");
  assert.equal(preview.backgroundRadius, 64);
  assert.equal(preview.icon, "moon");
  const favoriteActions = moon.props.actions.props.children.find((item) => item?.type === LibraryActions);
  await act(async () => {
    await LibraryActions(favoriteActions.props).props.children[0].props.onAction();
  });
  await act(async () => {
    grid().props.searchBarAccessory.props.onChange("favorites");
  });
  assert.equal(tiles().length, 1);
  assert.equal(tiles()[0].props.title, "moon_icon");
  await act(async () => {
    grid().props.searchBarAccessory.props.onChange("history");
  });
  assert.equal(tiles()[0].props.title, history.name);
  await act(async () => {
    grid().props.onSearchTextChange("unmatched term");
  });
  assert.equal(browser.root.findByType("Grid.EmptyView").props.title, "No Matching Icons");
});
