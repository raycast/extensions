const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = readFileSync(path.join(__dirname, "../src/toggle-caps-lock.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture({ state = true, helperError, hudError, toastError } = {}) {
  const calls = [];
  const mocks = {
    "@raycast/api": {
      Toast: { Style: { Failure: "failure", Success: "success" } },
      showHUD: async (title) => {
        calls.push(["hud", title]);
        if (hudError) throw hudError;
      },
      showToast: async (toast) => {
        calls.push(["toast", toast]);
        if (toastError) throw toastError;
      },
    },
    "swift:../swift/caps-lock": {
      toggleCapsLock: async () => {
        calls.push(["toggle"]);
        if (helperError) throw helperError;
        return state;
      },
    },
  };
  const context = {
    exports: {},
    Error,
    console: { error: (...args) => calls.push(["log", ...args]) },
    require: (name) => {
      assert.ok(Object.hasOwn(mocks, name), `Unexpected dependency: ${name}`);
      return mocks[name];
    },
  };
  vm.runInNewContext(compiled, context, { filename: "toggle-caps-lock.js" });
  return { command: context.exports.default, calls };
}

test("confirmed on and off states produce the matching HUD after one toggle", async () => {
  for (const [state, label] of [
    [true, "On"],
    [false, "Off"],
  ]) {
    const { command, calls } = fixture({ state });
    await command();
    assert.equal(calls.filter(([name]) => name === "toggle").length, 1);
    assert.deepEqual(
      calls.find(([name]) => name === "hud"),
      ["hud", `Caps Lock ${label}`],
    );
    assert.equal(calls.filter(([name]) => name === "toast").length, 0);
  }
});

test("bridge failure and invalid return values report toggle failure", async () => {
  for (const options of [{ helperError: new Error("keyboard denied") }, { state: "unknown" }, { state: null }]) {
    const { command, calls } = fixture(options);
    await command();
    assert.equal(calls.filter(([name]) => name === "hud").length, 0);
    const toast = calls.find(([name]) => name === "toast")[1];
    assert.equal(toast.style, "failure");
    assert.equal(toast.title, "Could not confirm Caps Lock");
    assert.ok(toast.message);
  }
});

test("HUD failure preserves the successful state report and never retries the toggle", async () => {
  for (const [state, label] of [
    [true, "On"],
    [false, "Off"],
  ]) {
    const { command, calls } = fixture({ state, hudError: new Error("HUD unavailable") });
    await command();
    assert.equal(calls.filter(([name]) => name === "toggle").length, 1);
    const toast = calls.find(([name]) => name === "toast")[1];
    assert.equal(toast.style, "success");
    assert.equal(toast.title, `Caps Lock ${label}`);
    assert.match(toast.message, /Caps Lock changed/);
    assert.equal(calls.filter(([name]) => name === "log").length, 1);
  }
});

test("notification failure never retries or reports a confirmed toggle as failed", async () => {
  const { command, calls } = fixture({
    hudError: new Error("HUD unavailable"),
    toastError: new Error("toast unavailable"),
  });
  await assert.rejects(command(), /toast unavailable/);
  assert.equal(calls.filter(([name]) => name === "toggle").length, 1);
  assert.equal(calls.find(([name]) => name === "toast")[1].style, "success");
});
