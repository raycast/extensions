import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync(new URL("../src/utils/refresh.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
}).outputText;

function harness({ refreshFails = false, menuBarDisabled = false } = {}) {
  const calls = [];
  const exports = {};
  const modules = {
    "@raycast/api": {
      LaunchType: { Background: "background" },
      closeMainWindow: async (options) => calls.push(["close", options]),
      popToRoot: async () => calls.push(["pop"]),
      launchCommand: async (options) => {
        calls.push(["launch", options]);
        if (menuBarDisabled) throw new Error("Command disabled");
      },
    },
    "@raycast/utils": {
      showFailureToast: async (error, options) => calls.push(["toast", options, error]),
    },
    "../commands/activities/api": {
      fetchActivities: async (...args) => {
        calls.push(["fetch", args]);
        if (refreshFails) throw new Error("Offline");
        return [{ id: 1 }];
      },
    },
    "../commands/user/api": {},
    "../commands/projects/api": {},
    "./storage": {
      getUser: async () => ({ id: 7 }),
      storeTodaysActivities: async (activities) => calls.push(["store", activities]),
    },
  };
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      assert.ok(name in modules, `Unexpected dependency ${name}`);
      return modules[name];
    },
  });
  return { finish: exports.finishMenuBarForm, calls };
}

test("a confirmed save refreshes the current user's cache before closing the form", async () => {
  const { finish, calls } = harness();
  await finish();
  assert.deepEqual(
    calls.map(([name]) => name),
    ["fetch", "store", "launch", "close", "pop"],
  );
  assert.deepEqual(calls[0][1], [null, 0, 7]);
  assert.equal(calls[3][1].clearRootSearch, true);
});

test("a post-save refresh failure still closes the form and reports that the change was saved", async () => {
  const { finish, calls } = harness({ refreshFails: true });
  await finish();
  assert.deepEqual(
    calls.map(([name]) => name),
    ["fetch", "toast", "launch", "close", "pop"],
  );
  assert.match(calls[1][1].title, /^Saved/);
  assert.match(calls[1][2].message, /Your change was saved/);
});

test("a disabled menu bar does not turn a successful save into a form error", async () => {
  const { finish, calls } = harness({ menuBarDisabled: true });
  await finish();
  assert.deepEqual(
    calls.map(([name]) => name),
    ["fetch", "store", "launch", "close", "pop"],
  );
});
