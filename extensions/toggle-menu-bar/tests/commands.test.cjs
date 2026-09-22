const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Transpile the real command modules, replacing only external host boundaries.
// No Raycast process or native helper is launched by these tests.
function fixture({ preferences = {}, background = false, fail = false, output = "Menu bar auto-hide: Always\n" } = {}) {
  const calls = [];
  let release;
  let paused = false;
  const api = {
    environment: { assetsPath: "/fixture", launchType: background ? "background" : "user" },
    LaunchType: { Background: "background" },
    Toast: { Style: { Success: "success", Failure: "failure" } },
    getPreferenceValues() {
      calls.push(["preferences"]);
      return preferences;
    },
    async updateCommandMetadata(value) {
      calls.push(["metadata", value.subtitle]);
    },
    async launchCommand(value) {
      calls.push(["launch", value]);
    },
    async showToast(value) {
      calls.push(["toast", value]);
      return value;
    },
    async closeMainWindow() {
      calls.push(["close"]);
    },
    Icon: {},
    Color: {},
    Action: "Action",
    ActionPanel: "ActionPanel",
    List: Object.assign(() => {}, { Section: "Section", Item: "Item" }),
  };
  const states = [],
    refs = [],
    effects = [];
  let stateIndex = 0,
    refIndex = 0,
    mounted = false;
  const react = {
    useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [
        states[index],
        (value) => {
          states[index] = value;
        },
      ];
    },
    useRef(initial) {
      const index = refIndex++;
      return (refs[index] ??= { current: initial });
    },
    useEffect(effect) {
      if (!mounted) effects.push(effect);
    },
  };
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        esModuleInterop: true,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText;
    const injectedRequire = (name) => {
      if (name === "@raycast/api") return api;
      if (name === "react") return react;
      if (name === "react/jsx-runtime")
        return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === "node:child_process") {
        const execFile = () => {
          throw new Error("Expected promisified execution");
        };
        execFile[require("node:util").promisify.custom] = (executable, args, options) =>
          new Promise((resolve, reject) => {
            calls.push(["exec", executable, args, options]);
            const done = () =>
              fail
                ? reject(Object.assign(new Error("helper failed"), { stderr: "fixture failure" }))
                : resolve({ stdout: typeof output === "function" ? output(args.slice(1)) : output, stderr: "" });
            if (paused) release = done;
            else done();
          });
        return { execFile };
      }
      if (name.startsWith(".")) {
        const base = path.resolve(path.dirname(filename), name);
        return load(fs.existsSync(base + ".ts") ? base + ".ts" : base + ".tsx");
      }
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })(
      injectedRequire,
      module,
      module.exports,
    );
    return module.exports;
  }
  const root = path.resolve(__dirname, "../src");
  return {
    calls,
    command: () => load(path.join(root, "toggle.ts")).default(),
    preferences: () => load(path.join(root, "preferences.ts")).togglePreferences(preferences),
    render() {
      stateIndex = refIndex = 0;
      const element = load(path.join(root, "select-menu-bar-mode.tsx")).default();
      const tree = element.type();
      mounted = true;
      return tree;
    },
    effects: async () => {
      effects.splice(0).forEach((effect) => effect());
      await new Promise(setImmediate);
    },
    pause: () => {
      paused = true;
    },
    release: () => {
      paused = false;
      release();
    },
  };
}

const by = (f, kind) => f.calls.filter(([name]) => name === kind);
const items = (tree) => tree.props.children.props.children;
const choose = (tree, index = 0) => items(tree)[index].props.actions.props.children.props.onAction();

test("manifest retains identity, command ID, extension preferences and defaults", () => {
  const manifest = require("../package.json");
  assert.equal(manifest.name, "toggle-menu-bar");
  assert.equal(manifest.title, "Toggle Menu Bar");
  assert.equal(manifest.author, "iamyeizi");
  assert.equal(manifest.icon, "command-icon.png");
  assert.equal(manifest.license, "MIT");
  assert.deepEqual(manifest.contributors, ["0xAdriaTorralba"]);
  assert.equal(manifest.commands[0].name, "toggle");
  assert.equal(manifest.commands[0].interval, "1m");
  assert.equal(manifest.commands[0].preferences, undefined);
  assert.deepEqual(
    manifest.preferences.map(({ name, default: value }) => [name, value]),
    [
      ["closeWindow", false],
      ["optionOne", "always"],
      ["optionTwo", "infull"],
    ],
  );
  for (const preference of manifest.preferences.slice(1))
    assert.deepEqual(
      preference.data.map(({ value }) => value),
      ["always", "ondesk", "infull", "never"],
    );
});

for (const [legacy, expected] of Object.entries({
  always: "always",
  ondesk: "desktop-only",
  infull: "fullscreen-only",
  never: "never",
})) {
  test(`maps persisted ${legacy} values without changing their identity`, () => {
    assert.deepEqual(fixture({ preferences: { optionOne: legacy, optionTwo: legacy } }).preferences(), {
      firstMode: expected,
      secondMode: expected,
      closeWindow: false,
    });
  });
}
test("missing preferences use historical defaults", () => {
  assert.deepEqual(fixture().preferences(), { firstMode: "always", secondMode: "fullscreen-only", closeWindow: false });
});
test("invalid saved preference cannot invoke mutation or report success", async () => {
  const f = fixture({ preferences: { optionOne: "bad" } });
  await f.command();
  assert.equal(by(f, "exec").length, 0);
  assert.equal(by(f, "toast")[0][1].style, "failure");
});
for (const fail of [false, true]) {
  test(`background ${fail ? "failure" : "success"} only reads status and updates metadata`, async () => {
    const f = fixture({ background: true, fail, preferences: { closeWindow: true } });
    await f.command();
    assert.deepEqual(
      f.calls.map(([kind]) => kind),
      ["exec", "metadata"],
    );
    assert.equal(by(f, "exec")[0][2].at(-1), "status");
    assert.equal(by(f, "metadata")[0][1], fail ? "Current: Unknown" : "Current: Always");
  });
}
for (const closeWindow of [false, true]) {
  test(`toggle respects closeWindow=${closeWindow} after confirmed success`, async () => {
    const f = fixture({ preferences: { closeWindow, optionOne: "ondesk", optionTwo: "infull" } });
    await f.command();
    assert.deepEqual(by(f, "exec")[0][2].slice(1), ["toggle", "desktop-only", "fullscreen-only"]);
    assert.equal(by(f, "close").length, Number(closeWindow));
    assert.equal(by(f, "toast")[0][1].style, "success");
    if (closeWindow) assert.equal(f.calls.at(-1)[0], "close");
  });
}
for (const options of [{ fail: true }, { output: "garbage" }, { output: "Menu bar auto-hide: Unknown" }]) {
  test(`toggle rejects unconfirmed helper result ${JSON.stringify(options)}`, async () => {
    const f = fixture({ ...options, preferences: { closeWindow: true } });
    await f.command();
    assert.equal(by(f, "close").length, 0);
    assert.equal(by(f, "toast")[0][1].style, "failure");
    assert.deepEqual(by(f, "metadata"), [["metadata", "Current: Unknown"]]);
  });
}
for (const closeWindow of [false, true]) {
  test(`picker highlights current mode and closes only after selection with closeWindow=${closeWindow}`, async () => {
    const f = fixture({ preferences: { closeWindow } });
    f.render();
    await f.effects();
    const tree = f.render();
    assert.equal(tree.props.selectedItemId, "always");
    assert.equal(items(tree)[0].props.accessories[0].tag.value, "Current");
    assert.equal(by(f, "close").length, 0);
    assert.equal(by(f, "preferences").length, 0);
    await choose(tree);
    assert.equal(by(f, "close").length, Number(closeWindow));
    assert.deepEqual(by(f, "exec")[1][2].slice(1), ["set", "always"]);
    assert.deepEqual(by(f, "launch")[0][1], { name: "toggle", type: "background" });
  });
}
test("picker suppresses duplicate actions before rerender and releases its guard", async () => {
  const f = fixture();
  f.render();
  await f.effects();
  const tree = f.render();
  f.pause();
  const first = choose(tree);
  const second = choose(tree);
  assert.equal(by(f, "exec").length, 2); // Initial status + one set.
  f.release();
  await Promise.all([first, second]);
  await choose(f.render());
  assert.equal(by(f, "exec").length, 3);
});
test("picker failure leaves window open, clears current marker, and permits retry", async () => {
  const f = fixture({ fail: true, preferences: { closeWindow: true } });
  f.render();
  await f.effects();
  await choose(f.render());
  assert.equal(by(f, "close").length, 0);
  assert.ok(by(f, "toast").every(([, toast]) => toast.style === "failure"));
  assert.ok(items(f.render()).every((item) => item.props.accessories.length === 0));
  await choose(f.render());
  assert.equal(by(f, "exec").length, 3);
});

test("selecting initially-current mode applies it after an external settings change", async () => {
  let liveLabel = "Always";
  const f = fixture({
    output: (args) => {
      if (args[0] === "set") liveLabel = "Always";
      return `Menu bar auto-hide: ${liveLabel}`;
    },
  });
  f.render();
  await f.effects();
  const tree = f.render();
  assert.equal(tree.props.selectedItemId, "always");
  liveLabel = "Never";
  await choose(tree);
  assert.equal(liveLabel, "Always");
  assert.deepEqual(by(f, "exec")[1][2].slice(1), ["set", "always"]);
  assert.equal(by(f, "toast").at(-1)[1].style, "success");
});
