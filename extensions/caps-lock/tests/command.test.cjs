const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { promisify } = require("node:util");
const vm = require("node:vm");
const ts = require("typescript");

const source = readFileSync(path.join(__dirname, "../src/toggle-caps-lock.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture({ stdout = "on\n", helperError, chmodError, hudError } = {}) {
  const calls = [];
  const execFile = () => {
    throw new Error("Expected the promisified API");
  };
  execFile[promisify.custom] = async (...args) => {
    calls.push(["exec", ...args]);
    if (helperError) throw helperError;
    return { stdout };
  };
  const mocks = {
    "@raycast/api": {
      environment: { assetsPath: "/mock/assets" },
      Toast: { Style: { Failure: "failure", Success: "success" } },
      showHUD: async (title) => {
        calls.push(["hud", title]);
        if (hudError) throw hudError;
      },
      showToast: async (toast) => {
        calls.push(["toast", toast]);
      },
    },
    "node:child_process": { execFile },
    "node:fs/promises": {
      chmod: async (...args) => {
        calls.push(["chmod", ...args]);
        if (chmodError) throw chmodError;
      },
    },
    "node:path": path,
    "node:util": { promisify },
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
  for (const [stdout, label] of [
    ["on\n", "On"],
    ["off\n", "Off"],
  ]) {
    const { command, calls } = fixture({ stdout });
    await command();
    assert.equal(calls.filter(([name]) => name === "exec").length, 1);
    assert.equal(calls.find(([name]) => name === "exec")[1], "/mock/assets/caps-lock");
    assert.equal(calls.find(([name]) => name === "exec")[2][0], "toggle");
    assert.equal(calls.find(([name]) => name === "exec")[3].timeout, 5000);
    assert.deepEqual(
      calls.find(([name]) => name === "hud"),
      ["hud", `Caps Lock ${label}`],
    );
    assert.equal(calls.filter(([name]) => name === "toast").length, 0);
  }
});

test("helper failure, invalid output, and executable-permission failure report toggle failure", async () => {
  for (const options of [
    { helperError: new Error("keyboard denied") },
    { stdout: "unknown\n" },
    { chmodError: new Error("read-only assets") },
  ]) {
    const { command, calls } = fixture(options);
    await command();
    assert.equal(calls.filter(([name]) => name === "hud").length, 0);
    const toast = calls.find(([name]) => name === "toast")[1];
    assert.equal(toast.style, "failure");
    assert.equal(toast.title, "Could not toggle Caps Lock");
    assert.ok(toast.message);
    if (options.chmodError) assert.equal(calls.filter(([name]) => name === "exec").length, 0);
  }
});

test("HUD failure preserves the successful state report and never retries the toggle", async () => {
  for (const [stdout, label] of [
    ["on\n", "On"],
    ["off\n", "Off"],
  ]) {
    const { command, calls } = fixture({ stdout, hudError: new Error("HUD unavailable") });
    await command();
    assert.equal(calls.filter(([name]) => name === "exec").length, 1);
    const toast = calls.find(([name]) => name === "toast")[1];
    assert.equal(toast.style, "success");
    assert.equal(toast.title, `Caps Lock ${label}`);
    assert.match(toast.message, /Caps Lock changed/);
    assert.equal(calls.filter(([name]) => name === "log").length, 1);
  }
});
