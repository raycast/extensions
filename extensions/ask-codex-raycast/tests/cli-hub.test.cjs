require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { CLI_DEFINITIONS } = require("../src/cli-detection.ts");
const { PROVIDER_COMMANDS } = require("../src/command-routing.ts");

function hub(t) {
  const Action = Object.assign(() => {}, { Push: "push" });
  const slots = [];
  const cleanups = new Map();
  let cursor = 0;
  let effects = [];
  let disposed = false;
  let lateWrites = 0;
  let launch = async () => {};
  const launches = [];
  const toasts = [];
  const metadata = [];
  const react = {
    useState(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = value;
      return [
        slots[i],
        (next) => {
          if (disposed) lateWrites++;
          slots[i] = typeof next === "function" ? next(slots[i]) : next;
        },
      ];
    },
    useRef(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: value };
      return slots[i];
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((value, n) => value !== slots[i][n])) {
        slots[i] = deps;
        effects.push(() => {
          cleanups.get(i)?.();
          cleanups.set(i, fn());
        });
      }
    },
  };
  class Detector {
    async scan(_, callback) {
      for (const entry of CLI_DEFINITIONS)
        callback({
          provider: entry.id,
          status: entry.id === "codex" ? "found" : "not-found",
          source: "automatic",
        });
      return [];
    }
    cancel() {}
  }
  const jsx = (type, props) => ({ type, props });
  const api = {
    Action,
    ActionPanel: "actions",
    List: Object.assign(() => {}, { Item: "item" }),
    Color: {},
    Icon: {},
    Keyboard: { Shortcut: { Common: {} } },
    Toast: { Style: {} },
    LaunchType: { UserInitiated: "user" },
    getPreferenceValues: () => ({ uiLanguage: "en" }),
    launchCommand: async (options) => {
      launches.push(options);
      return launch(options);
    },
    showToast: async (toast) => {
      toasts.push(toast);
    },
    updateCommandMetadata: async (value) => {
      metadata.push(value);
    },
  };
  const filename = path.resolve(__dirname, "../src/cli-hub.tsx");
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (id) => {
    if (id === "@raycast/api") return api;
    if (id === "react") return react;
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (id === "./cli-detection")
      return { CLI_DEFINITIONS, CliDetectionController: Detector };
    if (id === "./cli-settings") return { CliSettingsView: "cli-settings-view" };
    return require(path.resolve(path.dirname(filename), id + ".ts"));
  };
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  }).outputText;
  loaded._compile(source, filename);
  function render() {
    cursor = 0;
    const tree = loaded.exports.default();
    const pending = effects;
    effects = [];
    pending.forEach((fn) => fn());
    return tree;
  }
  function nodes(node) {
    if (!node || typeof node !== "object") return [];
    return [
      node,
      ...[node.props?.children, node.props?.actions]
        .flat(Infinity)
        .flatMap(nodes),
    ];
  }
  function action(id, index = 0) {
    const tree = nodes(render());
    const row = tree.find(
      (node) => node.type === "item" && node.props.id === id,
    );
    return nodes(row.props.actions).filter((node) => node.type === Action)[
      index
    ].props.onAction;
  }
  function push(id) {
    const row = nodes(render()).find(
      (node) => node.type === "item" && node.props.id === id,
    );
    return nodes(row.props.actions).find((node) => node.type === "push");
  }
  function dispose() {
    if (disposed) return;
    for (const fn of cleanups.values()) fn?.();
    disposed = true;
  }
  t.after(dispose);
  render();
  return {
    render,
    action,
    push,
    launches,
    toasts,
    metadata,
    dispose,
    setLaunch(fn) {
      launch = fn;
    },
    get lateWrites() {
      return lateWrites;
    },
  };
}

test("suite launcher uses each independent native command without passing prompts or session state", async (t) => {
  const ui = hub(t);
  for (const entry of CLI_DEFINITIONS) await ui.action(entry.id)();
  assert.deepEqual(
    ui.launches,
    CLI_DEFINITIONS.map((entry) => ({
      name: PROVIDER_COMMANDS[entry.id],
      type: "user",
    })),
  );
  assert.deepEqual(ui.push("codex")?.props.target, {
    type: "cli-settings-view",
    props: {},
  });
  assert.deepEqual(
    ui.launches.filter((options) => options.name === "cli-settings"),
    [],
  );
  assert.deepEqual(ui.metadata, [{ subtitle: "Local AI CLIs" }]);
});

test("disabled command rejection leaves the launcher usable and displays the enabled-state remedy", async (t) => {
  const ui = hub(t);
  ui.setLaunch(async () => {
    throw new Error("No enabled command");
  });
  await ui.action("qoder")();
  assert.equal(ui.toasts.length, 1);
  assert.match(ui.toasts[0].message, /Enable this command/);
  ui.setLaunch(async () => {});
  await ui.action("codex")();
  assert.equal(ui.launches.length, 2);
});

test("pending native launch blocks duplicate activation and releases the lock after completion", async (t) => {
  const ui = hub(t);
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  ui.setLaunch(() => gate);
  const pending = ui.action("codex")();
  await ui.action("antigravity")();
  assert.equal(ui.launches.length, 1);
  release();
  await pending;
  await ui.action("antigravity")();
  assert.equal(ui.launches.length, 2);
});

test("closing launcher during a delayed rejection prevents stale toast and state writes", async (t) => {
  const ui = hub(t);
  await new Promise(setImmediate);
  let reject;
  const gate = new Promise((_, fail) => {
    reject = fail;
  });
  ui.setLaunch(() => gate);
  const pending = ui.action("codex")();
  ui.dispose();
  reject(new Error("No enabled command"));
  await pending;
  assert.equal(ui.toasts.length, 0);
  assert.equal(ui.lateWrites, 0);
});
