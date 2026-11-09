const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { writeFileSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const { createHarness } = require("./helpers.cjs");
const quiet = { menubar: false, status: false };
const key = "caffeinationSession";

function session(h) {
  return JSON.parse(h.storage.get(key));
}
function managedPids(h) {
  return [...h.table.keys()].filter((pid) => pid >= 200 && pid < 300);
}

// This suite uses fake process tables and signals, but real persisted records
// and real filesystem locks. No actual sleep inhibitors are started or killed.
test("persists the caffeinate PID and creation time and recovers it after a Raycast relaunch", async () => {
  const h = createHarness();
  await h
    .load("utils.ts")
    .startCaffeinate(quiet, undefined, "-t 300", { kind: "for", endsAt: new Date(Date.now() + 300000).toISOString() });
  const saved = session(h);
  assert.equal(saved.pid, 200);
  assert.equal(saved.createdAt, h.table.get(200).createdAt);
  h.table.delete(100);
  h.fakeProcess.pid = 101;
  h.fakeProcess.ppid = 1;
  h.addProcess(101, { executable: "/usr/bin/node" });
  const relaunched = h.load("utils.ts");
  const state = await relaunched.getCaffeinationState();
  assert.equal(state.isManaged, true);
  assert.equal(state.totalSeconds, 300);
  assert.equal(state.reason.kind, "for");
  await relaunched.stopCaffeinate(quiet);
  assert.deepEqual(
    h.fakeProcess.kill.mock.calls.map(({ arguments: args }) => Array.from(args)),
    [[200, "SIGTERM"]],
  );
});

test("untracked caffeinate processes are external and cannot be stopped or adopted by matching flags", async () => {
  const h = createHarness();
  h.addProcess(900);
  h.addProcess(901);
  h.storage.set("caffeinationReason", JSON.stringify({ kind: "while", appName: "Old Coffee session" }));
  const utils = h.load("utils.ts");
  const state = await utils.getCaffeinationState();
  assert.equal(state.isRunning, true);
  assert.equal(state.isManaged, false);
  assert.equal(state.externalCount, 2);
  assert.equal(state.totalSeconds, null);
  assert.equal(state.reason, undefined);
  await utils.stopCaffeinate(quiet);
  assert.equal(h.fakeProcess.kill.mock.callCount(), 0);
  assert.ok(h.table.has(900) && h.table.has(901));
});

test("starting, replacing and stopping Coffee preserves every external process", async () => {
  const h = createHarness();
  h.addProcess(900);
  h.addProcess(901);
  const utils = h.load("utils.ts");
  await utils.startCaffeinate(quiet);
  await utils.startCaffeinate(quiet, undefined, "-t 600");
  assert.equal(h.table.has(200), false);
  assert.equal(session(h).pid, 201);
  const result = await utils.stopCaffeinate(quiet, true);
  assert.equal(result.isManaged, false);
  assert.equal(result.isRunning, true);
  assert.equal(result.externalCount, 2);
  assert.ok(h.table.has(900) && h.table.has(901));
  assert.match(h.api.showHUD.mock.calls[0].arguments[0], /external caffeination remains active/);
});

for (const [name, replacement] of [
  ["reused PID", { createdAt: "Thu Oct 22 10:00:00 2026" }],
  ["different user", { uid: 502 }],
  ["different executable", { executable: "/usr/bin/other" }],
]) {
  test(`does not stop a ${name} and clears stale ownership`, async () => {
    const h = createHarness();
    const utils = h.load("utils.ts");
    await utils.startCaffeinate(quiet);
    Object.assign(h.table.get(200), replacement);
    await utils.stopCaffeinate(quiet);
    assert.equal(h.fakeProcess.kill.mock.callCount(), 0);
    assert.ok(h.table.has(200));
    assert.equal(h.storage.has(key), false);
  });
}

for (const raw of ["invalid json", "null", "{}", JSON.stringify({ version: 0, pid: 900 })]) {
  test(`ignores malformed or unsupported session metadata: ${raw}`, async () => {
    const h = createHarness();
    h.addProcess(900);
    h.storage.set(key, raw);
    const state = await h.load("utils.ts").getCaffeinationState();
    assert.equal(state.isManaged, false);
    assert.equal(state.externalCount, 1);
    assert.equal(h.storage.has(key), false);
  });
}

test("natural expiry or watched-app exit clears ownership and never reuses its reason for external activity", async () => {
  const h = createHarness();
  const utils = h.load("utils.ts");
  await utils.startCaffeinate(quiet, undefined, "-w 400", { kind: "while", appName: "Editor" });
  h.table.delete(200);
  h.addProcess(900);
  const state = await utils.getCaffeinationState();
  assert.equal(state.isManaged, false);
  assert.equal(state.reason, undefined);
  assert.equal(state.externalCount, 1);
  assert.equal(h.storage.has(key), false);
});

for (const failure of ["denied", "malformed"]) {
  test(`a ${failure} process inspection preserves tracking and never signals any PID`, async () => {
    const h = createHarness();
    const utils = h.load("utils.ts");
    await utils.startCaffeinate(quiet);
    const saved = h.storage.get(key);
    h.processes.execFile.mock.mockImplementation((_executable, _args, _options, callback) => {
      if (failure === "denied") throw new Error("Process inspection denied");
      callback(null, "not a valid process table", "");
    });
    await assert.rejects(utils.getCaffeinationState());
    await assert.rejects(utils.stopCaffeinate(quiet));
    assert.equal(h.storage.get(key), saved);
    assert.equal(h.fakeProcess.kill.mock.callCount(), 0);
  });
}

test("rechecks creation identity immediately before signalling", async () => {
  const h = createHarness();
  const utils = h.load("utils.ts");
  await utils.startCaffeinate(quiet);
  const inspect = h.processes.execFile;
  let reads = 0;
  inspect.mock.mockImplementation((_executable, args, _options, callback) => {
    if (++reads === 3) h.table.get(200).createdAt = "Thu Oct 22 10:00:00 2026";
    const index = args.indexOf("-p");
    const rows = [...h.table.values()].filter((p) => index < 0 || p.pid === Number(args[index + 1]));
    callback(null, rows.map((p) => `${p.pid} ${p.uid} ${p.createdAt} ${p.executable}`).join("\n"), "");
  });
  await utils.stopCaffeinate(quiet);
  assert.equal(h.fakeProcess.kill.mock.callCount(), 0);
  assert.ok(h.table.has(200));
});

test("failed termination preserves the session and rolls back a requested schedule pause", async () => {
  const h = createHarness();
  const utils = h.load("utils.ts");
  await utils.startCaffeinate(quiet);
  const day = utils.numberToDayString(new Date().getDay()).toLowerCase();
  h.storage.set(day, JSON.stringify({ day, from: "00:00", to: "23:59", IsRunning: true, IsManuallyDecafed: false }));
  h.fakeProcess.kill.mock.mockImplementation(() => {
    throw Object.assign(new Error("Permission denied"), { code: "EPERM" });
  });
  await assert.rejects(utils.stopCaffeinate(quiet, false, { pauseRunningSchedule: true }), /Permission denied/);
  assert.equal(session(h).pid, 200);
  assert.equal(JSON.parse(h.storage.get(day)).IsRunning, true);
  assert.equal(JSON.parse(h.storage.get(day)).IsManuallyDecafed, false);
});

test("an already-exited process makes stop succeed", async () => {
  const h = createHarness();
  const utils = h.load("utils.ts");
  await utils.startCaffeinate(quiet);
  h.fakeProcess.kill.mock.mockImplementation((pid) => {
    h.table.delete(pid);
    throw Object.assign(new Error("Exited"), { code: "ESRCH" });
  });
  await utils.stopCaffeinate(quiet);
  assert.equal(h.storage.has(key), false);
});

test("asynchronous spawn errors reject without recording a session", async () => {
  const h = createHarness();
  h.processes.spawn.mock.mockImplementation(() => {
    const child = new EventEmitter();
    queueMicrotask(() => child.emit("error", new Error("Cannot spawn")));
    return child;
  });
  await assert.rejects(h.load("utils.ts").startCaffeinate(quiet), /Cannot spawn/);
  assert.equal(h.storage.has(key), false);
});

test("a storage failure rolls back the new child before reporting success", async () => {
  const h = createHarness();
  h.api.LocalStorage.setItem.mock.mockImplementation(async () => {
    throw new Error("Storage full");
  });
  await assert.rejects(h.load("utils.ts").startCaffeinate(quiet, "Started"), /Storage full/);
  assert.deepEqual(managedPids(h), []);
  assert.equal(h.api.showHUD.mock.callCount(), 0);
  assert.equal(h.processes.spawn.mock.calls[0].result.kill.mock.callCount(), 1);
});

test("ownership is persisted before the HUD can unload a view command", async () => {
  const h = createHarness();
  h.api.showHUD.mock.mockImplementation(async () => assert.equal(session(h).pid, 200));
  await h.load("utils.ts").startCaffeinate(quiet, "Started");
  assert.equal(h.api.showHUD.mock.callCount(), 1);
});

test("overlapping starts leave exactly one tracked Coffee process", async () => {
  const h = createHarness();
  h.addProcess(900);
  const first = h.load("utils.ts");
  const second = h.load("utils.ts");
  await Promise.all([first.startCaffeinate(quiet), second.startCaffeinate(quiet, undefined, "-t 600")]);
  assert.deepEqual(managedPids(h), [session(h).pid]);
  assert.ok(h.table.has(900));
});

test("recovers a lock left by a command that exited", async () => {
  const h = createHarness();
  mkdirSync(join(h.supportPath, "caffeination.lock"));
  writeFileSync(
    join(h.supportPath, "caffeination.lock", "owner-old.json"),
    JSON.stringify({
      pid: 999,
      uid: 501,
      createdAt: "Wed Oct 21 10:00:00 2026",
      executable: "/usr/bin/node",
      token: "old",
    }),
  );
  await h.load("utils.ts").startCaffeinate(quiet);
  assert.equal(session(h).pid, 200);
});

test("toggle starts Coffee alongside external activity and then stops only Coffee", async () => {
  const h = createHarness();
  h.addProcess(900);
  const toggle = h.load("caffeinateToggle.ts").default;
  await toggle();
  assert.equal(session(h).pid, 200);
  await toggle();
  assert.equal(h.storage.has(key), false);
  assert.ok(h.table.has(900));
});

test("auto-start is independent of external activity and preserves a surviving Coffee session on relaunch", async () => {
  const h = createHarness({ preferences: { startCaffeinateOnLaunch: true } });
  h.addProcess(900);
  const status = h.load("status.ts");
  assert.equal(await status.maybeAutoCaffeinate(), true);
  h.storage.set("autoCaffeinateRaycastPid", "pid:old-Raycast");
  assert.equal(await h.load("status.ts").maybeAutoCaffeinate(), false);
  assert.equal(h.processes.spawn.mock.callCount(), 1);
  assert.ok(h.table.has(900));
});

function schedule(h, running, from, to) {
  const day = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
  h.storage.set(day, JSON.stringify({ day, from, to, IsRunning: running, IsManuallyDecafed: false }));
  return day;
}

test("schedule completion stops its Coffee session and preserves external inhibitors", async () => {
  const h = createHarness();
  h.addProcess(900);
  const day = schedule(h, true, "00:00", "00:00");
  await h
    .load("utils.ts")
    .startCaffeinate(quiet, undefined, "-t 300", { kind: "schedule", day, from: "00:00", to: "00:00" });
  await h.load("status.ts").checkSchedule();
  assert.equal(h.table.has(200), false);
  assert.ok(h.table.has(900));
  assert.equal(JSON.parse(h.storage.get(day)).IsRunning, false);
});

test("an expired schedule cannot stop a replacement manual Coffee session", async () => {
  const h = createHarness();
  schedule(h, true, "00:00", "00:00");
  await h.load("utils.ts").startCaffeinate(quiet);
  await h.load("status.ts").checkSchedule();
  assert.ok(h.table.has(200));
});

test("status attributes external activity without a stale Coffee reason", async () => {
  const h = createHarness();
  h.addProcess(900);
  h.storage.set("caffeinationReason", JSON.stringify({ kind: "while", appName: "Editor" }));
  await h.load("status.ts").default({});
  const subtitle = h.api.updateCommandMetadata.mock.calls[0].arguments[0].subtitle;
  assert.match(subtitle, /External caffeination/);
  assert.doesNotMatch(subtitle, /Editor/);
});

test("AI tools report external activity remaining after stopping Coffee", async () => {
  const h = createHarness();
  h.addProcess(900);
  await h.load("utils.ts").startCaffeinate(quiet);
  const result = await h.load("tools/decaffeinate.ts").default();
  assert.match(result, /external caffeination remains active/);
  const status = await h.load("tools/check-caffeination-status.ts").default();
  assert.match(status, /Coffee is inactive; external caffeination is active/);
  assert.ok(h.table.has(900));
});

test("Windows keeps its existing worker ownership and leaves external detection unsupported", async () => {
  const h = createHarness({ platform: "win32" });
  const utils = h.load("utils.ts");
  await utils.startCaffeinate(quiet);
  const state = await utils.getCaffeinationState();
  assert.equal(state.externalCount, null);
  await utils.stopCaffeinate(quiet);
  assert.equal(h.windows.windowsStartCaffeinate.mock.callCount(), 1);
  assert.equal(h.windows.windowsStopCaffeinate.mock.callCount(), 1);
  assert.equal(h.processes.execFileSync.mock.callCount(), 0);
  assert.equal(h.processes.execFile.mock.callCount(), 0);
  assert.equal(h.fakeProcess.kill.mock.callCount(), 0);
});

test("accepts macOS system process rows with negative user IDs", async () => {
  const h = createHarness();
  h.addProcess(1031, { uid: -2, executable: "/usr/libexec/dhcp6d" });
  const state = await h.load("utils.ts").getCaffeinationState();
  assert.equal(state.isManaged, false);
  assert.equal(state.externalCount, 0);
});

test("concurrent recovery of an abandoned lock cannot remove a new owner's lock", async () => {
  const h = createHarness();
  mkdirSync(join(h.supportPath, "caffeination.lock"));
  writeFileSync(
    join(h.supportPath, "caffeination.lock", "owner-exited.json"),
    JSON.stringify({
      pid: 999,
      uid: 501,
      createdAt: "Wed Oct 21 10:00:00 2026",
      executable: "/usr/bin/node",
    }),
  );
  await Promise.all(Array.from({ length: 4 }, () => h.load("utils.ts").startCaffeinate(quiet)));
  assert.deepEqual(managedPids(h), [session(h).pid]);
});

test("manual stop remains honored during the same Raycast session even if external activity continues", async () => {
  const h = createHarness({ preferences: { startCaffeinateOnLaunch: true } });
  h.addProcess(900);
  const status = h.load("status.ts");
  assert.equal(await status.maybeAutoCaffeinate(), true);
  await h.load("utils.ts").stopCaffeinate(quiet);
  assert.equal(await status.maybeAutoCaffeinate(), false);
  assert.equal(h.storage.has(key), false);
  assert.ok(h.table.has(900));
});

test("Windows adapter preserves native worker timing and propagates inspection errors", async () => {
  const h = createHarness({ platform: "win32" });
  let fail = false;
  const adapter = h.load("windowsApi.ts", {
    "rust:../rust": {
      get_caffeinate_state: async () => {
        if (fail) throw new Error("Native state unavailable");
        return { running: true, sessionId: "200:123456789012345678", startTime: 1700000000, durationSeconds: 600 };
      },
    },
  });
  const state = await adapter.windowsGetCaffeinationState();
  assert.equal(state.isManaged, true);
  assert.equal(state.externalCount, null);
  assert.equal(state.startTime, 1700000000000);
  assert.equal(state.totalSeconds, 600);
  fail = true;
  await assert.rejects(adapter.windowsGetCaffeinationState(), /Native state unavailable/);
});

const legacyStart = "Mon Jan 5 10:00:00 2026";
const legacyRow = { createdAt: legacyStart, args: "/usr/bin/caffeinate -u -dim -t 3600" };

test("a pre-update Coffee session is offered for an explicit stop but never adopted or stopped implicitly", async () => {
  const h = createHarness();
  h.addProcess(900, legacyRow);
  const utils = h.load("utils.ts");
  const state = await utils.getCaffeinationState();
  assert.equal(state.isManaged, false);
  assert.equal(state.externalCount, 1);
  assert.deepEqual(
    { ...state.legacySession },
    {
      pid: 900,
      createdAt: legacyStart,
      endsAt: Date.parse(`${legacyStart} UTC`) + 3600 * 1000,
    },
  );
  assert.equal(h.storage.has(key), false);
  await utils.stopCaffeinate(quiet);
  assert.equal(h.fakeProcess.kill.mock.callCount(), 0);
  const stopped = await utils.stopLegacyCaffeinate(quiet, state.legacySession);
  assert.deepEqual(
    h.fakeProcess.kill.mock.calls.map(({ arguments: args }) => Array.from(args)),
    [[900, "SIGTERM"]],
  );
  assert.equal(stopped.isRunning, false);
  assert.equal(stopped.legacySession, undefined);
});

for (const [name, setup] of [
  [
    "a terminal caffeinate with the same flags",
    (h) => h.addProcess(900, { ...legacyRow, args: "caffeinate -u -dim -t 3600" }),
  ],
  ["a caffeinate with other flags", (h) => h.addProcess(900, { ...legacyRow, args: "/usr/bin/caffeinate -i -t 3600" })],
  ["another user's process", (h) => h.addProcess(900, { ...legacyRow, uid: 502 })],
  ["two matching processes", (h) => (h.addProcess(900, legacyRow), h.addProcess(901, legacyRow))],
  [
    "a process started after this version first ran",
    (h) => {
      h.storage.set("legacySessionCutoff", String(Date.parse(`${legacyStart} UTC`) - 1000));
      h.addProcess(900, legacyRow);
    },
  ],
]) {
  test(`does not offer ${name} as a previous Coffee session`, async () => {
    const h = createHarness();
    setup(h);
    const state = await h.load("utils.ts").getCaffeinationState();
    assert.equal(state.legacySession, undefined);
    assert.ok(state.externalCount >= 1);
  });
}

test("the first run fixes the legacy cutoff so later sessions never qualify", async () => {
  const h = createHarness();
  const utils = h.load("utils.ts");
  await utils.getCaffeinationState();
  const cutoff = Number(h.storage.get("legacySessionCutoff"));
  assert.ok(cutoff > 0);
  await utils.getCaffeinationState();
  assert.equal(Number(h.storage.get("legacySessionCutoff")), cutoff);
});

test("stopping a previous Coffee session rechecks its identity and never signals a replacement", async () => {
  const h = createHarness();
  h.addProcess(900, legacyRow);
  const utils = h.load("utils.ts");
  const { legacySession } = await utils.getCaffeinationState();
  h.table.get(900).createdAt = "Tue Jan 6 10:00:00 2026";
  await assert.rejects(utils.stopLegacyCaffeinate(quiet, legacySession), /no longer running/);
  assert.equal(h.fakeProcess.kill.mock.callCount(), 0);
  assert.ok(h.table.has(900));
});
