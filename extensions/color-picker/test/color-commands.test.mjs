import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { posix } from "node:path";
import test from "node:test";
import ts from "typescript";
import { formatColor } from "../src/lib/color-format.ts";

const require = createRequire(import.meta.url);

function loadModule(file, mocks) {
  const source = readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (!name.startsWith(".")) return require(name);
    const relative = posix.normalize(posix.join(posix.dirname(file), name));
    if (`./${relative}` in mocks) return mocks[`./${relative}`];
    const extension = existsSync(new URL(`../src/${relative}.ts`, import.meta.url)) ? ".ts" : ".tsx";
    return loadModule(`${relative}${extension}`, mocks);
  };
  new Function("require", "module", "exports", "console", outputText)(localRequire, module, module.exports, {
    warn() {},
    error() {},
  });
  return module.exports;
}

function loadCommand(file, mocks) {
  return loadModule(file, mocks).default;
}

async function pick({
  format = "hex",
  menuError,
  callbackError,
  nativeError,
  cancelled = false,
  context,
  wheel = false,
} = {}) {
  const effects = [];
  const navigation = [];
  const copied = [];
  const history = [];
  const hud = [];
  const failures = [];
  const launches = [];
  const callbacks = [];
  const color = { red: 1, green: 0, blue: 0, alpha: 1, colorSpace: "p3" };
  const command = loadCommand(wheel ? "color-wheel.tsx" : "pick-color.ts", {
    react: { useRef: (current) => ({ current }), useEffect: (effect) => effects.push(effect) },
    "@raycast/api": {
      Clipboard: { copy: async (text) => copied.push(text) },
      closeMainWindow: async () => navigation.push("close"),
      popToRoot: async () => navigation.push("root"),
      Detail: () => {},
      getPreferenceValues: () => ({ showColorName: true }),
      showHUD: async (text) => hud.push(text),
      LaunchType: { Background: "background", UserInitiated: "user" },
      launchCommand: async (options) => {
        launches.push(options);
        if (options.name === "menu-bar" && menuError) throw menuError;
      },
    },
    "@raycast/utils": { showFailureToast: async (error) => failures.push(error) },
    "./lib/history": { addToHistory: (color) => history.push(color) },
    "./lib/utils": {
      isMac: true,
      getFormattedColor: (color, output = format) => formatColor(color, output),
      getColorByProximity: (colors) =>
        Object.values(colors)
          .flat()
          .sort((a, b) => a.distance - b.distance),
    },
    "swift:../../swift/color-picker": {
      pickColor: async () => {
        if (nativeError) throw nativeError;
        return cancelled ? null : color;
      },
    },
    "raycast-cross-extension": {
      callbackLaunchCommand: async (options, result) => {
        callbacks.push({ options, result });
        if (callbackError) throw callbackError;
      },
    },
  });
  await command({ launchContext: context });
  if (wheel) {
    effects[0]();
    await flush();
  }
  return { copied, history, hud, failures, launches, callbacks, color, navigation };
}

test("a failed optional menu refresh preserves successful picking and returning to Organize Colors", async () => {
  for (const message of [
    "must be activated",
    "no enabled command thomas/color-picker/menu-bar",
    "worker unavailable",
  ]) {
    const result = await pick({ menuError: new Error(message), context: { source: "organize-colors" } });
    assert.equal(result.copied.length, 1);
    assert.deepEqual(result.history, [result.color]);
    assert.match(result.hud[0], /^Copied color/);
    assert.deepEqual(result.failures, []);
    assert.deepEqual(
      result.launches.map((launch) => launch.name),
      ["menu-bar", "organize-colors"],
    );
  }
});

test("picked color names work with P3, OKLCH, and unprefixed hex clipboard formats", async () => {
  for (const format of ["p3", "oklch", "hex-no-prefix"]) {
    const result = await pick({ format });
    assert.equal(result.copied[0], formatColor(result.color, format));
    assert.match(result.hud[0], /^Copied color .*\(.+\) to clipboard$/);
    assert.deepEqual(result.failures, []);
  }
});

test("cancelling a pick has no side effects, while native failures remain visible", async () => {
  const cancelled = await pick({ cancelled: true });
  assert.deepEqual([cancelled.copied, cancelled.history, cancelled.hud, cancelled.launches], [[], [], [], []]);
  const failed = await pick({ nativeError: new Error("native picker failed") });
  assert.deepEqual(failed.copied, []);
  assert.match(failed.hud[0], /Failed picking color/);
});

test("cross-extension callbacks retain both formats and report callback failures", async () => {
  const callbackError = new Error("callback unavailable");
  const options = { name: "caller" };
  const result = await pick({ format: "p3", callbackError, context: { callbackLaunchOptions: options } });
  assert.deepEqual(result.copied, []);
  assert.deepEqual(result.callbacks, [
    {
      options,
      result: {
        hex: formatColor(result.color, "hex"),
        formattedColor: formatColor(result.color, "p3"),
      },
    },
  ]);
  assert.deepEqual(result.failures, [callbackError]);
});

function converter({ text = "", selectedText = async () => "", lastFormat } = {}) {
  const state = [];
  const effects = [];
  let cursor = 0;
  const useState = (initial) => {
    const index = cursor++;
    if (!(index in state)) state[index] = initial;
    return [
      state[index],
      (value) => {
        state[index] = value;
      },
    ];
  };
  const Command = loadCommand("convert-color.tsx", {
    react: {
      useState,
      useRef: (current) => useState({ current })[0],
      useEffect: (effect) => effects.push(effect),
    },
    "@raycast/api": {
      List: Object.assign(() => {}, { EmptyView: () => {} }),
      LocalStorage: { getItem: async () => lastFormat },
      getSelectedText: selectedText,
    },
    "./lib/utils": { getFormattedColor: formatColor },
    "./components/ColorConvert": { ColorConvertListItem: () => {} },
  });
  const render = () => {
    cursor = 0;
    return Command({ arguments: { text } });
  };
  return { render, initialize: () => effects.shift()() };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test("typing a color converts it instead of filtering format names, and invalid input recovers", () => {
  const command = converter({ text: "#ff0000" });
  let view = command.render();
  assert.equal(view.props.filtering, false);
  assert.equal(view.props.searchText, "#ff0000");
  assert.equal(view.props.children[0].length, 12);
  view.props.onSearchTextChange("color(display-p3 1 0 0)");
  view = command.render();
  const p3 = view.props.children[0].find((row) => row.props.value === "p3");
  assert.equal(p3.props.convertedColor, "color(display-p3 1 0 0)");
  view.props.onSearchTextChange("rgb(");
  view = command.render();
  assert.equal(view.props.children[0].length, 0);
  assert.equal(view.props.children[1].props.title, "Invalid color");
  view.props.onSearchTextChange("  rebeccapurple  ");
  assert.equal(command.render().props.children[0][0].props.convertedColor, "#639");
});

test("selected text and last-used format initialize without overwriting user input", async () => {
  const command = converter({ selectedText: async () => "blue", lastFormat: "p3" });
  command.render();
  command.initialize();
  await flush();
  let view = command.render();
  assert.equal(view.props.searchText, "blue");
  assert.equal(view.props.children[0][0].props.value, "p3");
  assert.equal(view.props.isLoading, false);

  let resolveSelection;
  const pending = converter({
    selectedText: () =>
      new Promise((resolve) => {
        resolveSelection = resolve;
      }),
  });
  view = pending.render();
  pending.initialize();
  await flush();
  view.props.onSearchTextChange("red");
  resolveSelection("blue");
  await flush();
  assert.equal(pending.render().props.searchText, "red");
});

test("missing selected text leaves an editable converter without a failure toast", async () => {
  const command = converter({
    selectedText: async () => {
      throw new Error("no selection");
    },
  });
  command.render();
  command.initialize();
  await flush();
  const view = command.render();
  assert.equal(view.props.isLoading, false);
  assert.equal(view.props.searchText, "");
  assert.equal(view.props.children[1].props.title, "Enter a color");
});

test("the wheel closes only after a direct copy, preserving cancellation and callbacks", async () => {
  const copied = await pick({ wheel: true });
  assert.equal(copied.copied.length, 1);
  assert.deepEqual(copied.history, [copied.color]);
  assert.deepEqual(copied.navigation, ["close", "root"]);
  assert.deepEqual(copied.launches, []);

  for (const options of [
    { cancelled: true },
    { context: { callbackLaunchOptions: { name: "caller" } } },
    { context: { callbackLaunchOptions: { name: "caller" }, copyToClipboard: true } },
  ]) {
    const result = await pick({ wheel: true, ...options });
    assert.deepEqual(result.navigation, []);
    assert.equal(result.copied.length, options.context?.copyToClipboard ? 1 : 0);
    assert.equal(result.callbacks.length, options.cancelled ? 0 : 1);
  }
});

test("shared selection actions preserve string and saved-color exports and selection controls", () => {
  const Action = Object.assign(() => {}, { CopyToClipboard: () => {} });
  const Component = loadCommand("components/MultipleColorActions.tsx", {
    "@raycast/api": {
      Action,
      ActionPanel: { Section: () => {}, Submenu: () => {} },
      Icon: {},
      getPreferenceValues: () => ({ colorFormat: "hex" }),
    },
  });
  for (const items of [
    ["#ff0000", "#0000ff"],
    [{ color: "#ff0000" }, { color: "#0000ff" }],
  ]) {
    const calls = [];
    const selection = {
      actions: {
        toggleSelection: (item) => calls.push(item),
        selectAll: () => calls.push("all"),
        clearSelection: () => calls.push("clear"),
      },
      selected: { anySelected: true, allSelected: false, selectedItems: items, countSelected: 2 },
      helpers: { getIsItemSelected: () => true },
    };
    const view = Component({ item: items[0], selection, onCopySelected: () => calls.push("save") });
    const [submenu, toggle, selectAll, clear] = view.props.children;
    const [copy, exports] = submenu.props.children;
    assert.equal(copy.props.content, "#F00;#00F");
    assert.deepEqual(JSON.parse(exports[0].props.content), { colors: ["#F00", "#00F"] });
    assert.match(exports[1].props.content, /\.color-1/);
    assert.match(exports[2].props.content, /--color-1/);
    copy.props.onCopy();
    toggle.props.onAction();
    selectAll.props.onAction();
    clear.props.onAction();
    assert.deepEqual(calls, ["save", items[0], "all", "clear"]);
    assert.match(toggle.props.title, /^Deselect Color/);
    const withoutSave = Component({ item: items[0], selection });
    assert.equal(withoutSave.props.children[0].props.children[0].props.onCopy, undefined);
  }
});

test("menu-bar favorites copy on either click, while recent colors delete only on right click", async () => {
  const copied = [];
  const removed = [];
  const favorite = { color: "#ff0000", isFavorite: true };
  const recent = { color: "#0000ff" };
  const Menu = loadCommand("menu-bar.tsx", {
    "@raycast/api": {
      Clipboard: { copy: async (color) => copied.push(color) },
      showHUD: async () => {},
      getPreferenceValues: () => ({ colorFormat: "hex" }),
      environment: { isDevelopment: false },
      Icon: {},
      MenuBarExtra: Object.assign(() => {}, { Item: () => {}, Section: () => {} }),
    },
    "@raycast/utils": {},
    "./lib/history": {
      useHistory: () => ({ history: [favorite, recent], remove: (color) => removed.push(color) }),
    },
  });
  const menu = Menu();
  const favoriteElement = menu.props.children[1].props.children[0][0];
  const recentElement = menu.props.children[2].props.children[0];
  const favoriteItem = favoriteElement.type(favoriteElement.props);
  const recentItem = recentElement.type(recentElement.props);
  await favoriteItem.props.onAction({ type: "left-click" });
  await favoriteItem.props.onAction({ type: "right-click" });
  await recentItem.props.onAction({ type: "left-click" });
  await recentItem.props.onAction({ type: "right-click" });
  assert.deepEqual(copied, ["#F00", "#F00", "#00F"]);
  assert.deepEqual(removed, [recent.color]);
});
