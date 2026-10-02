const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

const source = ts.transpileModule(readFileSync("src/with-strava.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const oauthSource = readFileSync("node_modules/@raycast/utils/dist/oauth/withAccessToken.js", "utf8");

function setup({ configured = true, failure, mode = "view" } = {}) {
  const calls = { authorize: 0, command: 0 };
  const jsx = (type, props) => ({ type, props });
  const api = {
    environment: { commandMode: mode, commandName: "workouts" },
    Detail: "Detail",
    MenuBarExtra: Object.assign(() => null, { Item: "MenuItem" }),
    Action: Object.assign(() => null, { OpenInBrowser: "OpenInBrowser" }),
    ActionPanel: "ActionPanel",
    Icon: {},
    LaunchType: { UserInitiated: "user" },
    openExtensionPreferences() {},
    launchCommand() {},
  };
  const utils = {};
  runInNewContext(oauthSource, {
    exports: utils,
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "@raycast/api") return api;
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const exports = {};
  runInNewContext(source, {
    exports,
    Error,
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
      if (name === "react") return { Suspense: "Suspense" };
      if (name === "@raycast/api") return api;
      if (name === "@raycast/utils") return utils;
      if (name === "./api/auth")
        return {
          hasStravaCredentials: configured,
          provider: {
            authorize: async () => {
              calls.authorize++;
              if (failure) throw failure;
              return "valid-token";
            },
          },
        };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const Command = exports.withStrava(() => {
    calls.command++;
    assert.equal(utils.getAccessToken().token, "valid-token");
    return jsx("Workouts", {});
  });
  function render(element) {
    if (!element || typeof element !== "object") return element;
    if (typeof element.type === "function") return render(element.type(element.props));
    if (element.type === "Suspense") return render(element.props.children);
    return element;
  }
  async function complete() {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return render(jsx(Command, {}));
      } catch (pending) {
        assert.equal(typeof pending?.then, "function", "render must never throw an authentication error");
        await pending;
      }
    }
    throw new Error("Authentication did not settle");
  }
  return { complete, calls, utils };
}

test("cleared credentials show setup without starting OAuth or rendering workouts", async () => {
  const { complete, calls, utils } = setup({ configured: false });
  const view = await complete();
  assert.equal(view.type, "Detail");
  assert.match(view.props.markdown, /Set Up Your Strava App/);
  assert.deepEqual(calls, { authorize: 0, command: 0 });
  assert.throws(() => utils.getAccessToken(), /authenticated/);
});

for (const message of ["Invalid credentials", "Sign-in cancelled", "Token storage failed"]) {
  test(`${message} renders a recoverable error without a React error boundary`, async () => {
    const { complete, calls, utils } = setup({ failure: new Error(message) });
    const view = await complete();
    assert.equal(view.type, "Detail");
    assert.ok(view.props.markdown.includes(message));
    assert.deepEqual(calls, { authorize: 1, command: 0 });
    assert.throws(() => utils.getAccessToken(), /authenticated/);
  });
}

test("successful OAuth mounts workouts with the real access token", async () => {
  const { complete, calls } = setup();
  assert.equal((await complete()).type, "Workouts");
  assert.deepEqual(calls, { authorize: 1, command: 1 });
});
