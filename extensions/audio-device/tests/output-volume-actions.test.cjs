const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/output-volume-actions.tsx"), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

function loadActions({ volume = 0.5, pinned, writeFailures = 0, displayedVolume = volume } = {}) {
  const calls = [];
  const updates = [];
  const toasts = [];
  const failures = [];
  let pinRefreshes = 0;
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      if (name === "react") return { useRef: (current) => ({ current }) };
      if (name === "react/jsx-runtime") {
        const jsx = (type, props) => ({ type, props });
        return { jsx, jsxs: jsx, Fragment: "Fragment" };
      }
      if (name === "@raycast/api") {
        return {
          Action: "Action",
          Icon: {},
          Toast: { Style: { Success: "success", Failure: "failure" } },
          showToast: async (...args) => toasts.push(args),
        };
      }
      if (name === "@raycast/utils") {
        return { showFailureToast: async (error, options) => failures.push({ error, title: options.title }) };
      }
      if (name === "./audio-device") {
        return {
          getOutputDeviceVolume: async (id) => {
            calls.push(["read", id]);
            return volume;
          },
          setOutputDeviceVolume: async (id, level) => {
            calls.push(["write", id, level]);
            await new Promise(setImmediate);
            if (writeFailures-- > 0) throw new Error("Device unavailable");
            volume = level;
          },
        };
      }
      assert.equal(name, "./device-preferences");
      return {
        getPinnedVolume: async (type, uid) => {
          assert.equal(type, "output");
          assert.equal(uid, "selected-uid");
          return pinned;
        },
        setPinnedVolume: async (type, uid, level) => {
          calls.push(["pin", type, uid, level]);
          pinned = level;
        },
      };
    },
  });
  const element = exports.OutputVolumeActions({
    device: { id: "selected-id", uid: "selected-uid", name: "Selected output" },
    volumeInfo: { volume: displayedVolume },
    onVolumeUpdate: (uid, info) => updates.push([uid, info.volume]),
    onPinnedChange: () => pinRefreshes++,
  });
  const actions = element?.props.children;
  return {
    element,
    up: actions?.[0].props.onAction,
    down: actions?.[1].props.onAction,
    calls,
    updates,
    toasts,
    failures,
    pinRefreshes: () => pinRefreshes,
  };
}

test("rapid volume changes read the latest level in order and target the selected device", async () => {
  const { up, down, calls, updates } = loadActions({ volume: 0.4, displayedVolume: 0.1 });
  await Promise.all([up(), up(), down()]);
  assert.deepEqual(calls, [
    ["read", "selected-id"],
    ["write", "selected-id", 0.45],
    ["read", "selected-id"],
    ["write", "selected-id", 0.5],
    ["read", "selected-id"],
    ["write", "selected-id", 0.45],
  ]);
  assert.deepEqual(updates, [
    ["selected-uid", 0.45],
    ["selected-uid", 0.5],
    ["selected-uid", 0.45],
  ]);
});

for (const [volume, direction, expected] of [
  [0.98, "up", 1],
  [1, "up", 1],
  [0.02, "down", 0],
  [0, "down", 0],
]) {
  test(`${direction} from ${volume} clamps volume to ${expected}`, async () => {
    const actions = loadActions({ volume });
    await actions[direction]();
    assert.deepEqual(actions.calls[1], ["write", "selected-id", expected]);
  });
}

test("an existing pinned target follows each adjustment and refreshes its accessory", async () => {
  const actions = loadActions({ pinned: 50 });
  await actions.up();
  await actions.down();
  assert.deepEqual(
    actions.calls.filter(([operation]) => operation === "pin"),
    [
      ["pin", "output", "selected-uid", 55],
      ["pin", "output", "selected-uid", 50],
    ],
  );
  assert.equal(actions.pinRefreshes(), 2);
});

test("an unpinned device remains unpinned", async () => {
  const actions = loadActions();
  await actions.up();
  assert.equal(
    actions.calls.some(([operation]) => operation === "pin"),
    false,
  );
  assert.equal(actions.pinRefreshes(), 0);
});

test("a failed write leaves the displayed level and pin unchanged and allows the next action", async () => {
  const actions = loadActions({ pinned: 50, writeFailures: 1 });
  await Promise.all([actions.up(), actions.down()]);
  assert.equal(actions.failures.length, 1);
  assert.equal(actions.failures[0].error.message, "Device unavailable");
  assert.equal(actions.failures[0].title, "Failed to Adjust Volume for Selected output");
  assert.deepEqual(actions.updates, [["selected-uid", 0.45]]);
  assert.deepEqual(actions.calls.at(-1), ["pin", "output", "selected-uid", 45]);
  assert.equal(actions.pinRefreshes(), 1);
});

test("devices without software volume control have no adjustment actions", () => {
  assert.equal(loadActions({ volume: undefined, displayedVolume: null }).element, null);
});

for (const volume of [null, NaN, Infinity]) {
  test(`an unreadable live volume (${volume}) does not write or change the pin`, async () => {
    const unreadable = loadActions({ volume, displayedVolume: 0.5, pinned: 50 });
    await unreadable.up();
    assert.deepEqual(unreadable.calls, [["read", "selected-id"]]);
    assert.deepEqual(unreadable.updates, []);
    assert.equal(unreadable.pinRefreshes(), 0);
    assert.equal(unreadable.toasts[0][0], "failure");
  });
}
