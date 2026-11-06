const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createHarness, loadSource } = require("./helpers.cjs");

const { getUserStopDecision } = loadSource("userStopPolicy.ts", {});
const quiet = { menubar: false, status: false };

function runningSchedule(h) {
  const day = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()];
  const schedule = { day, from: "00:00", to: "23:59", IsRunning: true, IsManuallyDecafed: false };
  h.storage.set(day, JSON.stringify(schedule));
  return schedule;
}

test("user-stop policy distinguishes ordinary, paused-schedule and blocked stops without mutating the schedule", () => {
  const active = { day: "monday", from: "09:00", to: "17:00", IsRunning: true, IsManuallyDecafed: false };
  const ordinary = getUserStopDecision(undefined, false);
  assert.equal(ordinary.allowed, true);
  assert.equal(ordinary.pauseRunningSchedule, false);
  assert.equal(getUserStopDecision({ ...active, IsRunning: false }, false).allowed, true);
  assert.equal(getUserStopDecision(active, false).allowed, false);
  const pause = getUserStopDecision(active, true);
  assert.equal(pause.allowed, true);
  assert.equal(pause.pauseRunningSchedule, true);
  assert.equal(active.IsRunning, true);
  assert.equal(active.IsManuallyDecafed, false);
});

for (const filename of ["decaffeinate.ts", "caffeinateToggle.ts", "tools/decaffeinate.ts"]) {
  test(`${filename} preserves a running schedule and session when stopping is blocked`, async () => {
    const h = createHarness();
    await h.load("utils.ts").startCaffeinate(quiet);
    const schedule = runningSchedule(h);
    const saved = h.storage.get("caffeinationSession");
    const command = h.load(filename).default;
    if (filename.startsWith("tools/")) await assert.rejects(command(), /Caffeination schedule running/);
    else await command();
    assert.equal(h.storage.get("caffeinationSession"), saved);
    assert.equal(h.fakeProcess.kill.mock.callCount(), 0);
    assert.equal(JSON.parse(h.storage.get(schedule.day)).IsRunning, true);
    assert.equal(h.api.showToast.mock.callCount(), 1);
    const toast = h.api.showToast.mock.calls[0].arguments[0];
    assert.equal(toast.title, "Caffeination schedule running");
    await toast.primaryAction.onAction();
    assert.equal(h.api.launchCommand.mock.calls[0].arguments[0].name, "addSchedule");
  });

  test(`${filename} pauses a running schedule before stopping when the preference permits it`, async () => {
    const h = createHarness({ preferences: { decaffeinatePausesSchedules: true } });
    await h.load("utils.ts").startCaffeinate(quiet);
    const schedule = runningSchedule(h);
    const result = await h.load(filename).default();
    const paused = JSON.parse(h.storage.get(schedule.day));
    assert.equal(paused.IsRunning, false);
    assert.equal(paused.IsManuallyDecafed, true);
    assert.equal(h.storage.has("caffeinationSession"), false);
    assert.equal(h.fakeProcess.kill.mock.callCount(), 1);
    assert.equal(h.api.showToast.mock.callCount(), 0);
    if (filename.startsWith("tools/")) assert.match(result, /schedule paused/);
    else assert.match(h.api.showHUD.mock.calls[0].arguments[0], /schedule paused/);
  });
}

test("a failed user stop rolls the shared schedule pause back", async () => {
  const h = createHarness({ preferences: { decaffeinatePausesSchedules: true } });
  await h.load("utils.ts").startCaffeinate(quiet);
  const schedule = runningSchedule(h);
  const saved = h.storage.get("caffeinationSession");
  h.fakeProcess.kill.mock.mockImplementation(() => {
    throw Object.assign(new Error("Permission denied"), { code: "EPERM" });
  });
  await assert.rejects(h.load("decaffeinate.ts").default(), /Permission denied/);
  const restored = JSON.parse(h.storage.get(schedule.day));
  assert.equal(restored.IsRunning, true);
  assert.equal(restored.IsManuallyDecafed, false);
  assert.equal(h.storage.get("caffeinationSession"), saved);
  assert.equal(h.api.showHUD.mock.callCount(), 0);
});
