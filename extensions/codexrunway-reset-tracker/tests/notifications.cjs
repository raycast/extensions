const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
let now = Date.parse("2026-09-08T12:00:00Z");
class Clock extends Date {
  constructor(...args) {
    super(...(args.length ? args : [now]));
  }
  static now() {
    return now;
  }
}
const storage = new Map();
const sent = [];
let fail = false;
const environment = { launchType: "background" };
let fetched;
function load(file, mocks = {}) {
  const result = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2021,
      },
    }).outputText,
    {
      exports: result,
      require: (name) => mocks[name] ?? require(name),
      Date: Clock,
      URLSearchParams,
      Error,
    },
  );
  return result;
}
const api = load("src/api.ts");
const notifications = load("src/notifications.ts", {
  "./api": api,
  "./requests": { fetchRecords: async () => fetched },
  "@raycast/api": {
    environment,
    LaunchType: { Background: "background" },
    LocalStorage: {
      getItem: async (key) => storage.get(key),
      setItem: async (key, value) => storage.set(key, value),
    },
  },
  "@raycast/utils": {
    runAppleScript: async (script, args) => {
      if (fail) throw new Error("Denied");
      sent.push({ script, args });
    },
  },
});
const record = (id, at, extra = {}) => ({
  id,
  kind: "reset_completed",
  resetType: "global",
  completedAt: at,
  scope: { plans: ["all"] },
  ...extra,
});
const response = (items) => ({ ok: true, data: { items }, fetchedAt: now });
(async () => {
  await notifications.notifyNewResets(
    response([record("old", "2026-09-08T11:00:00Z")]),
    "all",
    true,
  );
  assert.equal(sent.length, 0, "first check is a quiet baseline");
  now += 600_000;
  const current = record("new", "2026-09-08T12:05:00Z");
  const schedule = record("schedule", current.completedAt, {
    kind: "reset_scheduled",
    scheduleState: "fulfilled",
    completionRecordId: "new",
  });
  await notifications.notifyNewResets(
    response([current, schedule]),
    "all",
    true,
  );
  assert.equal(sent.length, 1);
  assert.doesNotMatch(
    sent[0].args[1],
    /2 resets/,
    "linked records notify once",
  );
  await notifications.notifyNewResets(response([current]), "all", true);
  assert.equal(sent.length, 1);
  await notifications.notifyNewResets(
    response([record("historical", "2026-09-07T12:00:00Z")]),
    "all",
    true,
  );
  assert.equal(sent.length, 1, "newly surfaced historical records stay quiet");
  now += 600_000;
  const next = record("next", "2026-09-08T12:15:00Z");
  await notifications.notifyNewResets(
    { ...response([next]), warning: "Offline" },
    "all",
    true,
  );
  fail = true;
  await assert.rejects(
    notifications.notifyNewResets(response([next]), "all", true),
    /Denied/,
  );
  fail = false;
  await notifications.notifyNewResets(response([next]), "all", true);
  assert.equal(sent.length, 2, "failed delivery does not mark a reset as seen");
  await notifications.notifyNewResets(response([next]), "all", false);
  await notifications.notifyNewResets(response([next]), "all", true);
  assert.equal(sent.length, 2, "re-enabling establishes a baseline");
  await notifications.notifyNewResets(response([next]), "pro", true);
  now += 600_000;
  await notifications.notifyNewResets(
    response([
      record("plus-only", "2026-09-08T12:25:00Z", {
        scope: { plans: ["plus"] },
      }),
    ]),
    "pro",
    true,
  );
  assert.equal(sent.length, 2, "plan changes and other plans stay quiet");
  environment.launchType = "foreground";
  fetched = response([record("foreground", "2026-09-08T12:25:00Z")]);
  await notifications.fetchMenuRecords("url", "pro", true);
  assert.equal(sent.length, 2, "opening the menu never sends a notification");
  environment.launchType = "background";
  fail = true;
  assert.match(
    (await notifications.fetchMenuRecords("url", "pro", true))
      .notificationWarning,
    /Denied/,
  );
  assert.equal(sent.length, 2);
  fail = false;
  storage.set("reset-notifications", "broken JSON");
  await notifications.notifyNewResets(fetched, "pro", true);
  assert.equal(
    sent.length,
    2,
    "corrupt local state recovers with a quiet baseline",
  );
  now += 600_000;
  await notifications.notifyNewResets(
    response([
      record("announcement-only", null, {
        announcedAt: "2026-09-08T12:35:00Z",
      }),
    ]),
    "pro",
    true,
  );
  assert.equal(
    sent.length,
    3,
    "new completion announcements without an execution timestamp are eligible",
  );
  assert.match(sent.at(-1).args[1], /Announced/);
  await notifications.notifyNewResets(
    response([record("future", "2026-09-09T12:00:00Z")]),
    "pro",
    true,
  );
  assert.equal(sent.length, 3, "future timestamps are not completed events");
  console.log(
    "Notification baseline, deduplication, plan, and retry checks passed",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
