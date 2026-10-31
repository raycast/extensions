require("./load.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Execute real setup callbacks while replacing only React's hook host and the
// CLI transport. Replay the development mount probe before timers can fire.
function setup(t, preferences = {}, connectGate = Promise.resolve()) {
  let cursor = 0,
    mountEffect,
    starts = 0,
    catalogs = 0,
    completed = 0;
  const slots = [],
    writes = [];
  const react = {
    useRef(value) {
      const id = cursor++;
      if (!(id in slots)) slots[id] = { current: value };
      return slots[id];
    },
    useState(value) {
      const id = cursor++;
      if (!(id in slots)) slots[id] = value;
      return [
        slots[id],
        (next) => {
          slots[id] = typeof next === "function" ? next(slots[id]) : next;
        },
      ];
    },
    useEffect(fn) {
      cursor++;
      mountEffect = fn;
    },
  };
  const jsx = (type, props) => ({ type, props });
  const api = {
    Action: Object.assign(() => {}, {
      SubmitForm: "submit",
      OpenInBrowser: "browser",
    }),
    ActionPanel: "actions",
    Form: Object.assign("form", {
      Description: "description",
      Dropdown: Object.assign(() => {}, { Item: "option" }),
    }),
    Icon: {},
    Toast: { Style: {} },
    showToast: async () => {},
    openExtensionPreferences() {},
    LocalStorage: { setItem: async (...args) => writes.push(args) },
  };
  const filename = path.resolve(__dirname, "../src/setup.tsx");
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.require = (id) => {
    if (id === "react") return react;
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (id === "@raycast/api") return api;
    if (id === "./provider-menu") return { ProviderMenu: "providers" };
    if (id === "./provider")
      return {
        providerCapabilities: () => ({ label: "Codex" }),
        createProviderClient: () => {
          starts++;
          return {
            connect: () => connectGate,
            checkAuthentication: async () => {},
            close() {},
            listModels: async () => {
              catalogs++;
              return [
                {
                  model: "actual-model",
                  efforts: ["low"],
                  defaultEffort: "low",
                },
              ];
            },
          };
        },
      };
    return require(path.resolve(path.dirname(filename), id + ".ts"));
  };
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
      fileName: filename,
    }).outputText,
    filename,
  );
  const props = {
    preferences,
    provider: "codex",
    previous: null,
    selection: null,
    onProviderChange: async () => {},
    onComplete: () => completed++,
  };
  function render() {
    cursor = 0;
    return loaded.exports.SetupWizard(props);
  }
  function nodes(node) {
    return !node || typeof node !== "object"
      ? []
      : [
          node,
          ...[node.props?.children, node.props?.actions]
            .flat(Infinity)
            .flatMap(nodes),
        ];
  }
  function field(id) {
    return nodes(render()).find((node) => node.props.id === id)?.props;
  }
  let cleanup = () => {};
  t.after(() => cleanup());
  return {
    mount(probe = false) {
      render();
      cleanup = mountEffect();
      if (probe) {
        cleanup();
        cleanup = mountEffect();
      }
    },
    unmount() {
      cleanup();
    },
    async flush() {
      await new Promise((resolve) => setTimeout(resolve, 15));
      await new Promise(setImmediate);
    },
    submit: () =>
      nodes(render())
        .find((node) => node.type === "submit")
        .props.onSubmit(),
    field,
    get starts() {
      return starts;
    },
    get catalogs() {
      return catalogs;
    },
    get completed() {
      return completed;
    },
    writes,
  };
}

test("automatic setup launches once through the development mount probe and requires an explicit model", async (t) => {
  const ui = setup(t);
  ui.mount(true);
  await ui.flush();
  assert.equal(ui.starts, 1);
  assert.equal(ui.catalogs, 1);
  assert.equal(ui.field("model").value, "");
  await ui.submit();
  assert.equal(ui.completed, 0);
  assert.equal(ui.writes.length, 0);
  ui.field("model").onChange("actual-model");
  ui.field("effort").onChange("low");
  await ui.submit();
  assert.equal(ui.completed, 1);
  assert.equal(ui.writes.length, 2);
});

test("manual setup waits for the user's connection action", async (t) => {
  const ui = setup(t, { autoDetectCli: false });
  ui.mount();
  await ui.flush();
  assert.equal(ui.starts, 0);
  assert.equal(ui.field("model"), undefined);
  await ui.submit();
  assert.equal(ui.starts, 1);
  assert.ok(ui.field("model"));
});

test("leaving during automatic connection prevents subsequent catalog checks", async (t) => {
  let release;
  const ui = setup(
    t,
    {},
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  ui.mount();
  await ui.flush();
  assert.equal(ui.starts, 1);
  ui.unmount();
  release();
  await ui.flush();
  assert.equal(ui.catalogs, 0);
  assert.equal(ui.completed, 0);
  assert.equal(ui.writes.length, 0);
});
