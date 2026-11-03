const assert = require("node:assert/strict");
const { mock, test } = require("node:test");
const { createHarness } = require("./helpers.cjs");

const sessionId = "400:134370180001234567";

test("Windows startup returns the exact native session identity without rounding FILETIME", async () => {
  const h = createHarness({ platform: "win32" });
  const start = mock.fn(async () => sessionId);
  const adapter = h.load("windowsApi.ts", { "rust:../rust": { start_caffeinate: start } });
  assert.equal(await adapter.windowsStartCaffeinate("-t 90"), sessionId);
  const config = start.mock.calls[0].arguments[0];
  assert.equal(config.durationSeconds, 90);
  assert.equal(config.pid, null);
  assert.equal(config.windowHandle, null);
});

for (const args of ["-t 1.5", "-t -1", "-t 0", "-t", "-t 30 -t 60", "-t 9007199254740992"]) {
  test(`Windows rejects invalid timeout arguments before invoking native startup: ${args}`, async () => {
    const h = createHarness({ platform: "win32" });
    const start = mock.fn(async () => sessionId);
    const adapter = h.load("windowsApi.ts", { "rust:../rust": { start_caffeinate: start } });
    await assert.rejects(adapter.windowsStartCaffeinate(args));
    assert.equal(start.mock.callCount(), 0);
  });
}

test("Windows retains app and window targets when no timeout is supplied", async () => {
  const h = createHarness({ platform: "win32" });
  const start = mock.fn(async () => sessionId);
  const adapter = h.load("windowsApi.ts", { "rust:../rust": { start_caffeinate: start } });
  await adapter.windowsStartCaffeinate("-w 100 -wh 200");
  const config = start.mock.calls[0].arguments[0];
  assert.equal(config.durationSeconds, null);
  assert.equal(config.pid, 100);
  assert.equal(config.windowHandle, 200);
});

test("Windows state preserves native identity and normalizes absent optional fields", async () => {
  const h = createHarness({ platform: "win32" });
  const get = mock.fn(async () => ({ running: true, sessionId }));
  const adapter = h.load("windowsApi.ts", { "rust:../rust": { get_caffeinate_state: get } });
  const active = await adapter.windowsGetCaffeinationState();
  assert.equal(active.sessionId, sessionId);
  assert.equal(active.isManaged, true);
  assert.equal(active.externalCount, null);
  assert.equal(active.startTime, null);
  assert.equal(active.totalSeconds, null);
  get.mock.mockImplementation(async () => ({ running: false }));
  const inactive = await adapter.windowsGetCaffeinationState();
  assert.equal(inactive.sessionId, null);
  assert.equal(inactive.isManaged, false);
});

test("Windows conditional stop passes the exact identity and never invokes unconditional stop", async () => {
  const h = createHarness({ platform: "win32" });
  const stop = mock.fn(async () => true);
  const conditional = mock.fn(async () => false);
  const adapter = h.load("windowsApi.ts", {
    "rust:../rust": { stop_caffeinate: stop, stop_caffeinate_if_matches: conditional },
  });
  assert.equal(await adapter.windowsStopCaffeinateIfMatches(sessionId), false);
  assert.equal(conditional.mock.calls[0].arguments[0], sessionId);
  conditional.mock.mockImplementation(async () => true);
  assert.equal(await adapter.windowsStopCaffeinateIfMatches(sessionId), true);
  conditional.mock.mockImplementation(async () => {
    throw new Error("Cannot verify worker identity");
  });
  await assert.rejects(adapter.windowsStopCaffeinateIfMatches(sessionId), /Cannot verify worker identity/);
  assert.equal(stop.mock.callCount(), 0);
});
