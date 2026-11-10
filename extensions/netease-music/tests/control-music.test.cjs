const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function loadCommand(name, executionError) {
  const calls = { executions: [], hud: [], toast: [] };
  const api = {
    showHUD: async (message) => calls.hud.push(message),
  };
  const utils = {
    async runAppleScript(script, args, options) {
      calls.executions.push({ script, args: Array.from(args), options });
      if (executionError) throw executionError;
      return "";
    },
    showFailureToast: async (error, options) => calls.toast.push({ message: error.message, ...options }),
  };
  function load(file) {
    const module = { exports: {} };
    const source = ts.transpileModule(readFileSync(resolve(__dirname, "../src", file), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
    }).outputText;
    runInNewContext(source, {
      module,
      exports: module.exports,
      Error,
      require(id) {
        if (id === "@raycast/api") return api;
        if (id === "@raycast/utils") return utils;
        if (id === "./util") return load("util.tsx");
        return require(id);
      },
    });
    return module.exports;
  }
  return { command: load(`${name}.tsx`).default, calls };
}

test("Play executes through the shared runner with time for app startup", async () => {
  const { command, calls } = loadCommand("play");
  await command();
  assert.equal(calls.executions.length, 1);
  assert.equal(calls.executions[0].options.timeout, 30000);
  assert.deepEqual(calls.executions[0].args, ["play", "Play", "播放"]);
  assert.deepEqual(calls.hud, ["Play command completed."]);
  assert.equal(calls.toast.length, 0);
});

test("Toggle Play/Pause handles unavailable controls without rejecting the command", async () => {
  const { command, calls } = loadCommand("toggle-play", new Error("The controls are not ready. (-1712)"));
  await assert.doesNotReject(command);
  assert.equal(calls.hud.length, 0);
  assert.equal(calls.toast.length, 1);
  assert.match(calls.toast[0].message, /controls are not ready/);
});

test("Next Track explains a timeout without reporting success or retrying the action", async () => {
  const error = Object.assign(new Error("Command failed."), { timedOut: true });
  const { command, calls } = loadCommand("next-track", error);
  await assert.doesNotReject(command);
  assert.equal(calls.executions.length, 1);
  assert.equal(calls.hud.length, 0);
  assert.match(calls.toast[0].message, /took too long to respond/);
});

test("macOS permission errors explain how to enable Raycast access", async () => {
  for (const code of [-1743, -25211, 1002]) {
    const { command, calls } = loadCommand("play", new Error(`Access denied. (${code})`));
    await assert.doesNotReject(command);
    assert.equal(calls.hud.length, 0);
    assert.match(calls.toast[0].message, /Accessibility and Automation/);
  }
});

test("script failures show the diagnostic without dumping the executed script", async () => {
  const error = Object.assign(new Error("Command failed: osascript followed by the entire script."), {
    stderr: "This control is unavailable. Select a track and try again.",
  });
  const { command, calls } = loadCommand("play", error);
  await command();
  assert.equal(calls.hud.length, 0);
  assert.equal(calls.toast[0].message, error.stderr);
});

test("Dislike Track & Next Track runs both actions in order and reports one completion", async () => {
  const { command, calls } = loadCommand("dislike-and-next");
  await command();
  assert.deepEqual(
    calls.executions.map(({ args }) => args[0]),
    ["dislike", "next"]
  );
  assert.deepEqual(calls.hud, ["Dislike Track & Next Track command completed."]);
  assert.equal(calls.toast.length, 0);
});

test("Dislike Track & Next Track stops after a failed first action", async () => {
  const { command, calls } = loadCommand("dislike-and-next", new Error("The control is unavailable."));
  await assert.doesNotReject(command);
  assert.equal(calls.executions.length, 1);
  assert.equal(calls.executions[0].args[0], "dislike");
  assert.equal(calls.hud.length, 0);
  assert.equal(calls.toast.length, 1);
});
