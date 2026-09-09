const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the pure helpers without loading Raycast's native runtime.
const fixedNow = new Date("2026-09-08T12:00:00Z").getTime();
class Clock extends Date {
  constructor(...args) {
    super(...(args.length ? args : [fixedNow]));
  }
  static now() {
    return fixedNow;
  }
}
const api = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync("src/api.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2021,
    },
  }).outputText,
  { exports: api, Date: Clock, URLSearchParams },
);
const record = (overrides = {}) => ({
  id: "scheduled",
  kind: "reset_scheduled",
  resetType: "global",
  scheduleState: "pending",
  effectiveAt: "2026-09-08T13:00:00Z",
  ...overrides,
});
const first = record({
  id: "first",
  kind: "reset_completed",
  completedAt: "2026-09-08T09:00:00Z",
});
const latest = record({
  id: "latest",
  scheduleState: "fulfilled",
  completedAt: "2026-09-08T11:00:00Z",
});
assert.equal(api.resetTodayIn([record(), first, latest]).record.id, "latest");
assert.equal(api.resetTodayIn([record()]).resetToday, false);
assert.equal(api.resetTodayIn([]).record, undefined);
assert.equal(
  api.resetTodayAt(record({ completedAt: "2026-09-08T13:00:00Z" })),
  null,
);
assert.equal(
  api.resetTodayAt(
    record({
      scheduleState: "fulfilled",
      completedAt: "2026-09-07T11:00:00Z",
      effectiveAt: "2026-09-08T09:00:00Z",
    }),
  ),
  null,
);
assert.equal(
  api.resetTodayAt(
    record({ scheduleState: "fulfilled", effectiveAt: "2026-09-08T09:00:00Z" }),
  ),
  "2026-09-08T09:00:00Z",
);
assert.equal(
  api.resetTodayAt(record({ effectiveAt: "2026-09-08T09:00:00Z" })),
  null,
);
assert.equal(api.resetTodayAt(record({ completedAt: "invalid" })), null);
assert.equal(api.statusLabel(latest), "Global reset · Completed");
assert.equal(
  api.matchesPlan(record({ scope: { plans: ["all"] } }), "pro"),
  true,
);
assert.equal(
  api.matchesPlan(record({ scope: { plans: ["plus"] } }), "pro"),
  false,
);
assert.equal(api.matchesPlan(record(), "all"), true);
assert.equal(api.matchesPlan(record(), "pro"), false);
const later = record({ id: "later", effectiveAt: "2026-09-08T16:00:00Z" });
const earlier = record({ id: "earlier", effectiveAt: "2026-09-08T14:00:00Z" });
const elapsed = record({ id: "elapsed", effectiveAt: "2026-09-08T10:00:00Z" });
assert.equal(
  api.nextScheduleIn([latest, later, earlier, elapsed]).id,
  "earlier",
);
assert.equal(api.nextScheduleIn([latest, elapsed]).id, "elapsed");
assert.match(api.scheduleLabel(elapsed), /awaiting completion confirmation/);
assert.equal(
  api.nextScheduleIn([record({ scheduleState: "cancelled" })]),
  undefined,
);
assert.equal(
  api.nextScheduleIn([record({ completionRecordId: "done" })]),
  undefined,
);
assert.equal(api.nextScheduleIn([]), undefined);
assert.equal(
  api.scheduleLabel(record({ effectiveAt: null })),
  "Timing not yet confirmed",
);
const window = record({
  id: "window",
  scheduleWindow: {
    startAt: "2026-09-08T11:00:00Z",
    endAt: "2026-09-08T15:00:00Z",
  },
});
assert.equal(api.nextScheduleIn([earlier, window]).id, "window");
assert.doesNotMatch(api.scheduleLabel(window), /awaiting completion/);
const longText = record({
  text: `${"Announcement introduction. ".repeat(100)} Build models in Blender.`,
  scope: { plans: ["pro"], windows: ["weekly"] },
});
assert.equal(api.matchesSearch(longText, "BLENDER"), true);
assert.equal(api.matchesSearch(longText, " pro  blender "), true);
assert.equal(api.matchesSearch(longText, "weekly blender"), true);
assert.equal(api.matchesSearch(longText, "blender plus"), false);
assert.equal(api.matchesSearch(record({ text: null }), ""), true);
assert.ok(api.recordTime(latest) > api.recordTime(first));
assert.equal(api.recordTime(record({ effectiveAt: null })), 0);
assert.equal(
  api.formatWindow({ startAt: first.completedAt, endAt: first.completedAt }),
  api.formatDate(first.completedAt),
);
(async () => {
  await assert.rejects(
    api.parseRecords({ ok: false, status: 429 }),
    /HTTP 429/,
  );
  await assert.rejects(
    api.parseRecords({ ok: true, json: async () => ({ ok: false }) }),
    /Invalid records/,
  );
  const empty = { ok: true, data: { items: [] } };
  assert.equal(
    await api.parseRecords({ ok: true, json: async () => empty }),
    empty,
  );
  console.log("API checks passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
