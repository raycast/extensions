const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { createHarness } = require("./helpers.cjs");

function loadCommand() {
  const harness = createHarness();
  return { ...harness, command: harness.load("caffeinateFor.ts").default };
}

test("Caffeinate for uses a no-view command with optional inline duration arguments", () => {
  const manifest = JSON.parse(readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
  const command = manifest.commands.find(({ name }) => name === "caffeinateFor");
  assert.equal(command.mode, "no-view");
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
  test(`starts ${label} once, closes the launcher and clears duration arguments`, async () => {
    const { command, api, processes, storage } = loadCommand();
    const before = Date.now();
    await command({ arguments: args });
    const after = Date.now();

    assert.equal(api.showToast.mock.callCount(), 0);
    assert.equal(api.showHUD.mock.callCount(), 1);
    const [message] = api.showHUD.mock.calls[0].arguments;
    assert.equal(message, `Caffeinating your Mac for ${label}`);
    assert.equal(api.popToRoot.mock.callCount(), 0);
    assert.equal(api.closeMainWindow.mock.callCount(), 1);
    assert.equal(api.closeMainWindow.mock.calls[0].arguments[0].clearRootSearch, true);
    assert.equal(api.closeMainWindow.mock.calls[0].arguments[0].popToRootType, api.PopToRootType.Immediate);
    assert.equal(processes.spawn.mock.callCount(), 1);
    const [executable, flags] = processes.spawn.mock.calls[0].arguments;
    assert.equal(executable, "/usr/bin/caffeinate");
    assert.deepEqual(Array.from(flags), ["-u", "-dmi", "-t", duration]);
    assert.equal(processes.spawn.mock.calls[0].result.unref.mock.callCount(), 1);
    const reason = JSON.parse(storage.get("caffeinationSession")).reason;
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
  test(`rejects ${JSON.stringify(args)} without closing root search or changing caffeination`, async () => {
    const { command, api, processes, storage } = loadCommand();
    await command({ arguments: args });
    assert.equal(api.showToast.mock.callCount(), 1);
    assert.equal(api.showToast.mock.calls[0].arguments[0], "failure");
    assert.equal(api.showHUD.mock.callCount(), 0);
    assert.equal(api.closeMainWindow.mock.callCount(), 0);
    assert.equal(api.popToRoot.mock.callCount(), 0);
    assert.equal(processes.spawn.mock.callCount(), 0);
    assert.equal(processes.execFile.mock.callCount(), 0);
    assert.equal(storage.size, 0);
  });
}

test("starts caffeination and launches background updates before showing the HUD", async () => {
  // Shared startup is also used by Caffeinate Until, a view command which
  // Raycast 2 can unload when showHUD closes the window. Spawn and reason persistence must happen
  // before the HUD; menu-bar/status launches are started first so the IPC
  // is sent, but the HUD must not wait for those commands to finish.
  const { command, api, processes, makeChild } = loadCommand();
  const events = [];
  api.launchCommand.mock.mockImplementation(async ({ name }) => events.push(name));
  api.showHUD.mock.mockImplementation(async () => events.push("HUD"));
  processes.spawn.mock.mockImplementation(() => {
    events.push("spawn");
    const child = makeChild();
    child.unref = () => events.push("unref");
    return child;
  });
  await command({ arguments: { seconds: "30" } });
  assert.deepEqual(events, ["spawn", "unref", "index", "status", "HUD"]);
  assert.equal(api.popToRoot.mock.callCount(), 0);
});

test("shows HUD without waiting for menu-bar/status commands to finish", async () => {
  const { command, api, processes, makeChild } = loadCommand();
  const events = [];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  api.launchCommand.mock.mockImplementation(async ({ name }) => {
    events.push(`launch:${name}`);
    await gate;
    events.push(`done:${name}`);
  });
  api.showHUD.mock.mockImplementation(async () => events.push("HUD"));
  processes.spawn.mock.mockImplementation(() => {
    events.push("spawn");
    const child = makeChild();
    child.unref = () => events.push("unref");
    return child;
  });

  const finished = command({ arguments: { seconds: "30" } });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`HUD not shown, events: ${events.join(",")}`)), 1000);
    const tick = () => {
      if (events.includes("HUD")) {
        clearTimeout(timeout);
        resolve();
        return;
      }
      setImmediate(tick);
    };
    tick();
  });

  assert.ok(events.includes("spawn"));
  assert.ok(events.includes("launch:index"));
  assert.ok(events.includes("launch:status"));
  assert.equal(events.includes("done:index"), false);
  assert.equal(events.includes("done:status"), false);

  release();
  await finished;
  assert.equal(api.popToRoot.mock.callCount(), 0);
});

test("reports startup failure after closing the launcher", async () => {
  const { command, api, processes } = loadCommand();
  processes.spawn.mock.mockImplementation(() => {
    throw new Error("Some startup failure");
  });
  await command({ arguments: { seconds: "30" } });
  assert.equal(api.showToast.mock.callCount(), 1);
  assert.equal(api.showToast.mock.calls[0].arguments[1], "Failed to caffeinate");
  assert.match(api.showToast.mock.calls[0].arguments[2], /Some startup failure/);
  assert.equal(api.popToRoot.mock.callCount(), 0);
});

// --- stopCaffeinate HUD ordering ---

test("stopCaffeinate shows HUD without waiting for refreshes to finish", async () => {
  const events = [];
  const harness = createHarness();
  const { api, fakeProcess, table, load } = harness;
  const utils = load("utils.ts");
  await utils.startCaffeinate({ menubar: false, status: false });
  fakeProcess.kill.mock.mockImplementation((pid) => {
    events.push("stop");
    table.delete(pid);
  });
  api.launchCommand.mock.mockImplementation(async ({ name }) => events.push(name));
  api.showHUD.mock.mockImplementation(async () => events.push("HUD"));
  await utils.stopCaffeinate({ menubar: true, status: true }, true);
  assert.deepEqual(events, ["stop", "index", "status", "HUD"]);
});

// --- caffeinateUntil picker route ---

function loadUntilPicker() {
  const events = [];
  const harness = createHarness();
  const { api, processes, storage, makeChild, load } = harness;
  Object.assign(api, {
    Action: { SubmitForm: "Action.SubmitForm" },
    ActionPanel: "ActionPanel",
    Form: function Form() {},
  });
  api.showHUD.mock.mockImplementation(async () => events.push("HUD"));
  api.popToRoot.mock.mockImplementation(async () => events.push("popToRoot"));
  api.launchCommand.mock.mockImplementation(async ({ name }) => events.push(name));
  api.Form.DatePicker = function DatePicker() {};
  api.Form.DatePicker.Type = { DateTime: "DateTime" };
  processes.spawn.mock.mockImplementation(() => {
    events.push("spawn");
    const child = makeChild();
    child.unref = () => events.push("unref");
    return child;
  });

  const react = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState: (init) => [init, () => {}],
    useEffect: () => {},
  };

  const Component = load("caffeinateUntil.tsx", { react }).default;

  const tree = Component({ arguments: { time: "" } });

  function findOnSubmit(el) {
    if (!el || typeof el !== "object") return null;
    if (el.props && typeof el.props.onSubmit === "function") return el.props.onSubmit;
    if (el.props && el.props.actions) {
      const found = findOnSubmit(el.props.actions);
      if (found) return found;
    }
    for (const child of el.children || []) {
      const found = findOnSubmit(child);
      if (found) return found;
    }
    return null;
  }

  const onSubmit = findOnSubmit(tree);
  return { onSubmit, events, api, storage };
}

test("caffeinateUntil picker awaits caffeination before returning to root", async () => {
  const { onSubmit, events } = loadUntilPicker();
  assert.ok(onSubmit, "onSubmit handler found in the form tree");

  const target = new Date(Date.now() + 3600_000); // 1 hour from now
  await onSubmit({ target });

  // popToRoot must come after all the caffeination work (spawn, reason,
  // updates, HUD). In the old code popToRoot ran first and could tear the
  // view down before spawn executed.
  assert.deepEqual(events, ["spawn", "unref", "index", "status", "HUD", "popToRoot"]);
});

test("caffeinateUntil picker rejects null target without starting caffeinate", async () => {
  const { onSubmit, events, api } = loadUntilPicker();
  await onSubmit({ target: null });

  assert.equal(api.showToast.mock.callCount(), 1);
  assert.deepEqual(events, []);
});

test("closes the launcher before slow ownership persistence and still awaits startup", async () => {
  const { command, api, storage } = loadCommand();
  let release;
  let reached;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const persisting = new Promise((resolve) => {
    reached = resolve;
  });
  api.LocalStorage.setItem.mock.mockImplementation(async (key, value) => {
    if (key === "caffeinationSession") {
      reached();
      await gate;
    }
    storage.set(key, value);
  });
  let finished = false;
  const running = command({ arguments: { seconds: "30" } }).then(() => {
    finished = true;
  });
  await persisting;
  assert.equal(api.closeMainWindow.mock.callCount(), 1);
  assert.equal(api.closeMainWindow.mock.calls[0].arguments[0].clearRootSearch, true);
  assert.equal(api.showHUD.mock.callCount(), 0);
  assert.equal(finished, false);
  assert.equal(storage.has("caffeinationSession"), false);
  release();
  await running;
  assert.equal(JSON.parse(storage.get("caffeinationSession")).durationSeconds, 30);
  assert.equal(api.showHUD.mock.callCount(), 1);
});

test("closes the launcher before any process inspection or spawn", async () => {
  const { command, api, processes, makeChild } = loadCommand();
  let closed = false;
  api.closeMainWindow.mock.mockImplementation(async () => {
    assert.equal(processes.execFile.mock.callCount(), 0);
    assert.equal(processes.spawn.mock.callCount(), 0);
    closed = true;
  });
  processes.spawn.mock.mockImplementation(() => {
    assert.equal(closed, true);
    return makeChild();
  });
  await command({ arguments: { seconds: "30" } });
  assert.equal(closed, true);
  assert.equal(api.popToRoot.mock.callCount(), 0);
});

test("repeated no-view launches use their new duration and request a root-search reset every time", async () => {
  const { command, api, storage, processes } = loadCommand();
  await command({ arguments: { seconds: "30" } });
  assert.equal(JSON.parse(storage.get("caffeinationSession")).durationSeconds, 30);
  await command({ arguments: { minutes: "2" } });
  assert.equal(JSON.parse(storage.get("caffeinationSession")).durationSeconds, 120);
  assert.equal(processes.spawn.mock.callCount(), 2);
  assert.equal(api.closeMainWindow.mock.callCount(), 2);
  assert.ok(
    api.closeMainWindow.mock.calls.every(
      ({ arguments: [options] }) => options.clearRootSearch && options.popToRootType === api.PopToRootType.Immediate,
    ),
  );
});
