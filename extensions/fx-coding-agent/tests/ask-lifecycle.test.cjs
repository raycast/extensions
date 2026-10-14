const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { create, act } = require("react-test-renderer");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test("Ask Fx cancels through the real usePromise hook, retries with a fresh signal, and aborts on unmount", async () => {
  const component = (name) => (props) =>
    React.createElement(name, props, props.children, props.actions, props.metadata);
  const api = {
    Detail: Object.assign(component("Detail"), { Metadata: Object.assign(component("Metadata"), { Label: "Label" }) }),
    ActionPanel: "ActionPanel",
    Action: Object.assign(component("Action"), { CopyToClipboard: "CopyToClipboard" }),
    Icon: {},
    environment: { launchType: "user", commandMode: "view" },
    LaunchType: { Background: "background" },
    Cache: class {},
  };
  // Load the installed utility implementation; only native Raycast UI is mocked.
  const utilitiesFile = require.resolve("@raycast/utils");
  const utilities = new Module(utilitiesFile, module);
  utilities.paths = Module._nodeModulePaths(path.dirname(utilitiesFile));
  utilities.require = (id) => (id === "@raycast/api" ? api : Module.prototype.require.call(utilities, id));
  utilities._compile(readFileSync(utilitiesFile, "utf8"), utilitiesFile);

  const requests = [];
  let revalidate;
  const fx = {
    getFxPreferences: () => ({ fxPath: "fixture-fx" }),
    runFxJson: (_executable, _args, { signal }) =>
      new Promise((resolve, reject) => {
        requests.push({ signal, resolve });
        signal.addEventListener("abort", () => reject(Object.assign(new Error("cancelled"), { name: "AbortError" })), {
          once: true,
        });
      }),
  };
  const filename = path.resolve(__dirname, "../src/ask-fx.tsx");
  const command = new Module(filename, module);
  command.paths = module.paths;
  command.require = (id) => {
    if (id === "@raycast/api") return api;
    if (id === "@raycast/utils") {
      return {
        ...utilities.exports,
        usePromise: (...args) => {
          const state = utilities.exports.usePromise(...args);
          revalidate = state.revalidate;
          return state;
        },
      };
    }
    if (id === "./lib/fx") return fx;
    if (id === "./components/fx-error-actions") return { FxErrorActions: "FxErrorActions" };
    return require(id);
  };
  command._compile(
    ts.transpileModule(readFileSync(filename, "utf8") + "\nexports.TestAskResult = AskResult;", {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    filename,
  );

  let renderer;
  try {
    await act(async () => {
      renderer = create(React.createElement(command.exports.TestAskResult, { prompt: "fixture", workspace: "/tmp" }));
    });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].signal.aborted, false);
    const action = (title) => renderer.root.findAllByType("Action").find((item) => item.props.title === title);
    await act(async () => action("Cancel").props.onAction());
    assert.equal(requests[0].signal.aborted, true);
    assert.equal(renderer.root.findByType("Detail").props.isLoading, false);
    assert.equal(renderer.root.findByType("Detail").props.markdown, "# Request Cancelled");
    assert.equal(action("Cancel"), undefined);

    await act(async () => {
      action("Run Again").props.onAction();
    });
    assert.equal(requests.length, 2);
    assert.notEqual(requests[1].signal, requests[0].signal);
    assert.equal(requests[1].signal.aborted, false);
    assert.equal(renderer.root.findByType("Detail").props.isLoading, true);
    await act(async () => requests[1].resolve({ output: "done", exit_code: 0 }));
    assert.equal(renderer.root.findByType("Detail").props.markdown, "done");
    assert.equal(renderer.root.findByType("Detail").props.isLoading, false);

    await act(async () => {
      action("Run Again").props.onAction();
    });
    assert.equal(requests.length, 3);
    await act(async () => {
      revalidate();
    });
    assert.equal(requests[2].signal.aborted, true);
    assert.equal(requests.length, 4);
    assert.equal(requests[3].signal.aborted, false);
    await act(async () => renderer.unmount());
    assert.equal(requests[3].signal.aborted, true);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
  }
});
