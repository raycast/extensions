const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test, mock } = require("node:test");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function loadSource(filename, dependencies) {
  const source = readFileSync(path.join(__dirname, "..", "src", filename), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    process: { platform: "darwin" },
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

function loadCommand() {
  const storage = new Map();
  let finish;
  let effect;
  const started = { current: false };
  const api = {
    showHUD: mock.fn(async () => {}),
    showToast: mock.fn(async () => {}),
    popToRoot: mock.fn(async () => finish()),
    Toast: { Style: { Failure: "failure", Animated: "animated" } },
    getPreferenceValues: () => ({ preventDisplay: true, preventSystem: true, preventDisk: true }),
    launchCommand: mock.fn(async () => {}),
    LaunchType: { Background: "background" },
    LocalStorage: {
      removeItem: async (key) => storage.delete(key),
      setItem: async (key, value) => storage.set(key, value),
    },
  };
  const child = { unref: mock.fn() };
  const processes = { spawn: mock.fn(() => child), execSync: mock.fn() };
  const utils = loadSource("utils.ts", {
    "@raycast/api": api,
    "node:child_process": processes,
    "./windowsApi": {},
  });
  const Component = loadSource("caffeinateFor.tsx", {
    "@raycast/api": api,
    "./utils": utils,
    react: {
      useRef: () => started,
      useEffect: (callback) => {
        effect = callback;
      },
    },
  }).default;
  async function command(props) {
    started.current = false;
    const finished = new Promise((resolve) => {
      finish = resolve;
    });
    assert.equal(Component(props), null);
    effect();
    assert.equal(Component(props), null);
    effect();
    await finished;
  }
  return { command, api, processes, storage, child };
}

test("Caffeinate for uses a view command with optional inline duration arguments", () => {
  const manifest = JSON.parse(readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
  const command = manifest.commands.find(({ name }) => name === "caffeinateFor");
  assert.equal(command.mode, "view");
  assert.deepEqual(
    command.arguments.map(({ name }) => name),
    ["hours", "minutes", "seconds"],
  );
  assert.ok(command.arguments.every(({ required }) => required === false));
});

for (const [args, duration, label] of [
  [{ hours: "1" }, "3600", "1h"],
  [{ minutes: "2" }, "120", "2m"],
  [{ seconds: "30" }, "30", "30s"],
  [{ hours: "", minutes: "2", seconds: "" }, "120", "2m"],
  [{ hours: "1", minutes: "2", seconds: "3" }, "3723", "1h2m3s"],
]) {
  test(`starts ${label} once and returns to root without rendering a form`, async () => {
    const { command, api, processes, storage, child } = loadCommand();
    const before = Date.now();
    await command({ arguments: args });
    const after = Date.now();

    assert.equal(api.showToast.mock.callCount(), 0);
    assert.equal(api.showHUD.mock.callCount(), 1);
    const [message] = api.showHUD.mock.calls[0].arguments;
    assert.equal(message, `Caffeinating your Mac for ${label}`);
    assert.equal(api.popToRoot.mock.callCount(), 1);
    assert.equal(processes.spawn.mock.callCount(), 1);
    const [executable, flags] = processes.spawn.mock.calls[0].arguments;
    assert.equal(executable, "/usr/bin/caffeinate");
    assert.deepEqual(Array.from(flags), ["-u", "-dmi", "-t", duration]);
    assert.equal(child.unref.mock.callCount(), 1);
    const reason = JSON.parse(storage.get("caffeinationReason"));
    assert.equal(reason.kind, "for");
    assert.ok(Date.parse(reason.endsAt) >= before + Number(duration) * 1000);
    assert.ok(Date.parse(reason.endsAt) <= after + Number(duration) * 1000);
    assert.deepEqual(
      api.launchCommand.mock.calls.map(({ arguments: [launch] }) => launch.name),
      ["index", "status"],
    );
  });
}

for (const args of [
  {},
  { hours: "", minutes: "", seconds: "" },
  { hours: "0" },
  { hours: "-1" },
  { minutes: "1.5" },
  { seconds: "abc" },
  { hours: "Infinity" },
  { hours: "1e308" },
]) {
  test(`rejects ${JSON.stringify(args)} and exits the invisible view without changing caffeination`, async () => {
    const { command, api, processes, storage } = loadCommand();
    await command({ arguments: args });
    assert.equal(api.showToast.mock.callCount(), 1);
    assert.equal(api.showToast.mock.calls[0].arguments[0], "failure");
    assert.equal(api.showHUD.mock.callCount(), 0);
    assert.equal(api.popToRoot.mock.callCount(), 1);
    assert.equal(processes.spawn.mock.callCount(), 0);
    assert.equal(processes.execSync.mock.callCount(), 0);
    assert.equal(storage.size, 0);
  });
}

test("shows the HUD before waiting for background updates", async () => {
  const { command, api } = loadCommand();
  const events = [];
  api.launchCommand.mock.mockImplementation(async ({ name }) => events.push(name));
  api.showHUD.mock.mockImplementation(async () => events.push("HUD"));
  await command({ arguments: { seconds: "30" } });
  assert.deepEqual(events, ["HUD", "index", "status"]);
  assert.equal(api.popToRoot.mock.callCount(), 1);
});

test("reports startup failure and exits the invisible view", async () => {
  const { command, api, processes } = loadCommand();
  processes.spawn.mock.mockImplementation(() => {
    throw new Error("Some startup failure");
  });
  await command({ arguments: { seconds: "30" } });
  assert.equal(api.showToast.mock.callCount(), 1);
  assert.equal(api.showToast.mock.calls[0].arguments[1], "Failed to caffeinate");
  assert.match(api.showToast.mock.calls[0].arguments[2], /Some startup failure/);
  assert.equal(api.popToRoot.mock.callCount(), 1);
});
