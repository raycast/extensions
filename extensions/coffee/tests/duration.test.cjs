const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createHarness, loadSource } = require("./helpers.cjs");

const { calculateDuration, parseCaffeinateTimeout, validateDurationSeconds } = loadSource("duration.ts", {});
const quiet = { menubar: false, status: false };

test("duration components accept whole values and reject invalid components before summing", () => {
  assert.equal(calculateDuration({ hours: 1, minutes: 2, seconds: 3 }), 3723);
  assert.equal(calculateDuration({ minutes: 90 }), 5400);
  for (const input of [
    {},
    { seconds: 0 },
    { seconds: 1.5 },
    { hours: -1, minutes: 90 },
    { seconds: NaN },
    { seconds: Infinity },
    { seconds: Number.MAX_SAFE_INTEGER + 1 },
    { hours: Number.MAX_SAFE_INTEGER },
    { seconds: "30" },
    { seconds: null },
  ]) {
    assert.throws(() => calculateDuration(input), /duration|whole numbers/);
  }
});

test("a duration must fit both safe integer arithmetic and a representable end date", () => {
  const lastDate = 8_640_000_000_000_000;
  assert.equal(validateDurationSeconds(1, lastDate - 1000), 1);
  assert.throws(() => validateDurationSeconds(1, lastDate), /end date/);
  assert.throws(() => validateDurationSeconds(Number.MAX_SAFE_INTEGER), /end date/);
  assert.throws(() => validateDurationSeconds(Number.MAX_SAFE_INTEGER + 1), /supported range/);
});

test("timeout parsing uses the same whole-second representation on both platforms", () => {
  assert.equal(parseCaffeinateTimeout(["-u", "-dmi", "-t", "300"]), 300);
  assert.equal(parseCaffeinateTimeout(["-t", "00030", "-w", "123"]), 30);
  assert.equal(parseCaffeinateTimeout(["-u", "-dmis"]), null);
  assert.equal(parseCaffeinateTimeout(["-w", "123", "-wh", "456"]), null);
});

const invalidTimeouts = [
  "-t",
  "-t 0",
  "-t -30",
  "-t 1.5",
  "-t NaN",
  "-t Infinity",
  "-t 1e3",
  "-t +30",
  "-t 0x20",
  "-t 30 -t 60",
  "-t300",
  "-it 300",
  "-t 9007199254740992",
  "-t 9007199254740991",
];

test("malformed timeout flags are rejected instead of becoming indefinite or losing ownership", () => {
  for (const value of invalidTimeouts) {
    assert.throws(() => parseCaffeinateTimeout(value.split(" ")), /timeout|duration|seconds|end date/);
  }
});

for (const platform of ["darwin", "win32"]) {
  test(`${platform} rejects invalid start durations before inspecting, replacing or refreshing a session`, async () => {
    const h = createHarness({ platform });
    const owned = h.addProcess(200);
    const saved = JSON.stringify({ ...owned, version: 1, startedAt: Date.now(), durationSeconds: 300 });
    h.storage.set("caffeinationSession", saved);
    const utils = h.load("utils.ts");
    for (const args of invalidTimeouts) {
      await assert.rejects(utils.startCaffeinate(quiet, "Started", args));
    }
    assert.equal(h.storage.get("caffeinationSession"), saved);
    assert.ok(h.table.has(200));
    assert.equal(h.processes.spawn.mock.callCount(), 0);
    assert.equal(h.processes.execFileSync.mock.callCount(), 0);
    if (h.processes.execFile) assert.equal(h.processes.execFile.mock.callCount(), 0);
    assert.equal(h.fakeProcess.kill.mock.callCount(), 0);
    assert.equal(h.windows.windowsStartCaffeinate.mock.callCount(), 0);
    assert.equal(h.windows.windowsStopCaffeinate.mock.callCount(), 0);
    assert.equal(h.api.showHUD.mock.callCount(), 0);
    assert.equal(h.api.launchCommand.mock.callCount(), 0);
  });
}

test("invalid AI durations preserve the current managed session", async () => {
  const h = createHarness();
  await h.load("utils.ts").startCaffeinate(quiet, undefined, "-t 300");
  const saved = h.storage.get("caffeinationSession");
  const tool = h.load("tools/caffeinate-for.ts").default;
  for (const input of [{ seconds: 1.5 }, { hours: -1, minutes: 90 }, { hours: Number.MAX_SAFE_INTEGER }]) {
    await assert.rejects(tool(input));
  }
  assert.equal(h.storage.get("caffeinationSession"), saved);
  assert.ok(h.table.has(JSON.parse(saved).pid));
  assert.equal(h.processes.spawn.mock.callCount(), 1);
  assert.equal(h.fakeProcess.kill.mock.callCount(), 0);
  assert.equal(h.api.showHUD.mock.callCount(), 0);
});

test("valid AI duration persists the same timeout it reports", async () => {
  const h = createHarness();
  const message = await h.load("tools/caffeinate-for.ts").default({ minutes: 2, seconds: 30 });
  assert.equal(message, "Mac will stay awake for 2m30s");
  assert.equal(JSON.parse(h.storage.get("caffeinationSession")).durationSeconds, 150);
  assert.equal((await h.load("utils.ts").getCaffeinationState()).isManaged, true);
});

test("out-of-range command durations leave the launcher and existing session untouched", async () => {
  const h = createHarness();
  await h.load("utils.ts").startCaffeinate(quiet);
  const saved = h.storage.get("caffeinationSession");
  await h.load("caffeinateFor.ts").default({ arguments: { seconds: String(Number.MAX_SAFE_INTEGER) } });
  assert.equal(h.storage.get("caffeinationSession"), saved);
  assert.equal(h.api.closeMainWindow.mock.callCount(), 0);
  assert.equal(h.api.showToast.mock.callCount(), 1);
  assert.equal(h.api.showHUD.mock.callCount(), 0);
  assert.equal(h.processes.spawn.mock.callCount(), 1);
});
