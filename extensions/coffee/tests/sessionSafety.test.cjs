const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createHarness } = require("./helpers.cjs");

const quiet = { menubar: false, status: false };
const sessionKey = "caffeinationSession";

function expiredSchedule(h) {
  const day = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
  h.storage.set(day, JSON.stringify({ day, from: "00:00", to: "00:00", IsRunning: true, IsManuallyDecafed: false }));
  return { kind: "schedule", day, from: "00:00", to: "00:00" };
}

test("delayed schedule expiry preserves a manual replacement and its saved metadata", async () => {
  const h = createHarness();
  const utils = h.load("utils.ts");
  const reason = expiredSchedule(h);
  await utils.startCaffeinate(quiet, undefined, "-t 300", reason);
  let replacement;
  const status = h.load("status.ts", {
    "./utils": {
      ...utils,
      getCaffeinationState: async () => {
        const observed = await utils.getCaffeinationState();
        await utils.startCaffeinate(quiet, undefined, "-t 600", {
          kind: "for",
          endsAt: new Date(Date.now() + 600000).toISOString(),
        });
        replacement = h.storage.get(sessionKey);
        return observed;
      },
    },
  });
  await status.checkSchedule();
  assert.equal(h.storage.get(sessionKey), replacement);
  assert.ok(h.table.has(JSON.parse(replacement).pid));
  assert.equal(h.fakeProcess.kill.mock.callCount(), 1); // Only the replaced schedule was stopped.
  assert.equal(JSON.parse(h.storage.get(reason.day)).IsRunning, false);
});

test("conditional stop matches a scheduled identity and remains a no-op after it ends", async () => {
  const h = createHarness();
  const utils = h.load("utils.ts");
  h.addProcess(900);
  await utils.startCaffeinate(quiet, undefined, "-t 300", expiredSchedule(h));
  const original = await utils.getCaffeinationState();
  assert.equal(typeof original.sessionId, "string");
  assert.equal((await h.load("utils.ts").getCaffeinationState()).sessionId, original.sessionId);
  const result = await utils.stopCaffeinateIfMatches(quiet, original.sessionId);
  assert.equal(result.stopped, true);
  assert.equal(result.state.sessionId, null);
  assert.equal(result.state.externalCount, 1);
  assert.equal((await utils.stopCaffeinateIfMatches(quiet, original.sessionId)).stopped, false);
  assert.equal(h.fakeProcess.kill.mock.callCount(), 1);
});

test("conditional stop rejects a manual session even with its exact identity", async () => {
  const h = createHarness();
  const utils = h.load("utils.ts");
  await utils.startCaffeinate(quiet);
  const state = await utils.getCaffeinationState();
  const saved = h.storage.get(sessionKey);
  assert.equal((await utils.stopCaffeinateIfMatches(quiet, state.sessionId)).stopped, false);
  assert.equal(h.storage.get(sessionKey), saved);
  assert.equal(h.fakeProcess.kill.mock.callCount(), 0);
});

test("PID reuse cannot satisfy an old scheduled session identity", async () => {
  const h = createHarness();
  const utils = h.load("utils.ts");
  await utils.startCaffeinate(quiet, undefined, "-t 300", expiredSchedule(h));
  const { sessionId } = await utils.getCaffeinationState();
  h.table.get(200).createdAt = "Thu Oct 22 10:00:00 2026";
  const result = await utils.stopCaffeinateIfMatches(quiet, sessionId);
  assert.equal(result.stopped, false);
  assert.equal(result.state.isManaged, false);
  assert.ok(h.table.has(200));
  assert.equal(h.fakeProcess.kill.mock.callCount(), 0);
});

test("malformed reason fields cannot discard otherwise valid ownership", async () => {
  const h = createHarness();
  const utils = h.load("utils.ts");
  await utils.startCaffeinate(quiet);
  for (const reason of [{ kind: "for", endsAt: 2026 }, { kind: "until", until: [2026] }, null]) {
    h.storage.set(sessionKey, JSON.stringify({ ...JSON.parse(h.storage.get(sessionKey)), reason }));
    const state = await utils.getCaffeinationState();
    assert.equal(state.isManaged, true);
    assert.equal(state.reason, undefined);
  }
});

test("malformed schedules are ignored without deleting stored data", async () => {
  const h = createHarness();
  const utils = h.load("utils.ts");
  const { day } = expiredSchedule(h);
  for (const raw of ["invalid JSON", "null", "[]", "{}", JSON.stringify({ day, from: 12 })]) {
    h.storage.set(day, raw);
    assert.equal(await utils.getSchedule(), undefined);
    assert.equal(h.storage.get(day), raw);
  }
  h.api.LocalStorage.getItem.mock.mockImplementation(async () => {
    throw new Error("Storage unavailable");
  });
  await assert.rejects(utils.getSchedule(), /Storage unavailable/);
});

test("status uses one full scan; stop polls only its selected PID before final status", async () => {
  const h = createHarness();
  const utils = h.load("utils.ts");
  await utils.startCaffeinate(quiet);
  h.processes.execFile.mock.resetCalls();
  await utils.getCaffeinationState();
  assert.equal(h.processes.execFile.mock.calls.filter(({ arguments: [, args] }) => args.includes("-axww")).length, 1);
  h.processes.execFile.mock.resetCalls();
  await utils.stopCaffeinate(quiet);
  const queries = h.processes.execFile.mock.calls.map(({ arguments: [, args] }) => args);
  assert.equal(queries.filter((args) => args.includes("-axww")).length, 1);
  assert.ok(queries.slice(0, -1).every((args) => args.includes("-p")));
  assert.equal(h.processes.execFileSync.mock.callCount(), 0);
});

test("a targeted inspection failure after reading metadata preserves ownership", async () => {
  const h = createHarness();
  const utils = h.load("utils.ts");
  await utils.startCaffeinate(quiet);
  const saved = h.storage.get(sessionKey);
  h.processes.execFile.mock.mockImplementation((executable, args, options, callback) => {
    if (args.includes("200"))
      callback(Object.assign(new Error("Inspection denied"), { code: 1 }), "", "Permission denied");
    else {
      const row = h.table.get(100);
      callback(null, `${row.pid} ${row.uid} ${row.createdAt} ${row.executable}`, "");
    }
  });
  await assert.rejects(utils.stopCaffeinate(quiet), /Inspection denied/);
  assert.equal(h.storage.get(sessionKey), saved);
  assert.equal(h.fakeProcess.kill.mock.callCount(), 0);
});

test("Windows reasons are identity-bound and legacy metadata cannot authorize expiry", async () => {
  const h = createHarness({ platform: "win32" });
  const utils = h.load("utils.ts");
  const native = {
    sessionId: "200:123456789012345678",
    isManaged: true,
    isRunning: true,
    externalCount: null,
    totalSeconds: 300,
    startTime: 1000,
  };
  h.windows.windowsGetCaffeinationState.mock.mockImplementation(async () => native);
  const reason = expiredSchedule(h);
  await utils.startCaffeinate(quiet, undefined, "-t 300", reason);
  assert.equal((await utils.getCaffeinationState()).reason.kind, "schedule");
  h.storage.set("caffeinationReason", JSON.stringify(reason));
  assert.equal((await utils.getCaffeinationState()).reason, undefined);
  assert.equal((await utils.stopCaffeinateIfMatches(quiet, native.sessionId)).stopped, false);
  assert.equal(h.windows.windowsStopCaffeinateIfMatches.mock.callCount(), 0);
});

test("Windows conditional stop preserves a replacement's reason metadata", async () => {
  const h = createHarness({ platform: "win32" });
  const utils = h.load("utils.ts");
  let native = {
    sessionId: "200:123456789012345678",
    isManaged: true,
    isRunning: true,
    externalCount: null,
    totalSeconds: 300,
    startTime: 1000,
  };
  h.windows.windowsGetCaffeinationState.mock.mockImplementation(async () => native);
  await utils.startCaffeinate(quiet, undefined, "-t 300", expiredSchedule(h));
  const previousId = native.sessionId;
  let replacement;
  h.windows.windowsStopCaffeinateIfMatches.mock.mockImplementation(async (expected) => {
    assert.equal(expected, previousId);
    native = { ...native, sessionId: "201:123456789012345679" };
    replacement = JSON.stringify({ sessionId: native.sessionId, reason: { kind: "while", appName: "Editor" } });
    h.storage.set("caffeinationReason", replacement);
    return false;
  });
  const result = await utils.stopCaffeinateIfMatches(quiet, previousId);
  assert.equal(result.stopped, false);
  assert.equal(result.state.reason.appName, "Editor");
  assert.equal(h.storage.get("caffeinationReason"), replacement);
});

test("ordinary Windows stop cannot clear metadata saved by a concurrent replacement", async () => {
  const h = createHarness({ platform: "win32" });
  const utils = h.load("utils.ts");
  const replacement = { sessionId: "201:123456789012345679", reason: { kind: "while", appName: "Editor" } };
  h.windows.windowsStopCaffeinate.mock.mockImplementation(async () => {
    h.storage.set("caffeinationReason", JSON.stringify(replacement));
  });
  h.windows.windowsGetCaffeinationState.mock.mockImplementation(async () => ({
    sessionId: replacement.sessionId,
    isManaged: true,
    isRunning: true,
    externalCount: null,
    totalSeconds: null,
    startTime: 1000,
  }));
  await utils.stopCaffeinate(quiet);
  assert.equal((await utils.getCaffeinationState()).reason.appName, "Editor");
  assert.equal(h.storage.get("caffeinationReason"), JSON.stringify(replacement));
});
