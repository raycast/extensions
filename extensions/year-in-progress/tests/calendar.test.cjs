const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { test } = require("node:test");
const { createLoader } = require("./helpers.cjs");

const progress = createLoader()("utils/progress.ts");

function item(defaults, id) {
  return defaults.find((value) => value.id === `default:${id}`);
}

test("quarter closes at the next quarter's midnight, including Q4", () => {
  assert.equal(progress.getQuarterProgressNum(new Date(2026, 8, 30, 12)), 99);
  assert.equal(progress.getQuarterProgressNum(new Date(2026, 11, 31, 12)), 99);
  assert.equal(progress.getQuarterProgressNum(new Date(2027, 0, 1)), 0);
  const quarter = item(progress.getDefaultProgress(new Date(2026, 11, 31, 12)), "quarter");
  assert.equal(quarter.endDate, new Date(2027, 0, 1).getTime());
});

test("year retains calendar-day counting for ordinary and leap years", () => {
  assert.equal(progress.getYearProgressNum(new Date(2024, 1, 29)), Math.floor((60 / 366) * 100));
  assert.equal(progress.getYearProgressNum(new Date(2024, 11, 31)), 100);
  assert.equal(progress.getYearProgressNum(new Date(2025, 11, 31)), 100);
  assert.equal(progress.getYearProgressNum(new Date(2025, 0, 1)), 0);
  assert.equal(progress.getYearProgressNum(new Date(NaN)), 0);
});

test("custom percentages clamp outside a valid interval and reject unsafe arithmetic", () => {
  const start = new Date(1000);
  const end = new Date(2000);
  assert.equal(progress.getProgressNumByDate(start, end, new Date(0)), 0);
  assert.equal(progress.getProgressNumByDate(start, end, new Date(1500)), 50);
  assert.equal(progress.getProgressNumByDate(start, end, new Date(2000)), 100);
  assert.equal(progress.getProgressNumByDate(start, end, new Date(3000)), 100);
  for (const args of [
    [start, start, start],
    [end, start, start],
    [new Date(NaN), end, start],
    [start, new Date(NaN), start],
    [start, end, new Date(NaN)],
  ]) {
    assert.equal(progress.getProgressNumByDate(...args), 0);
  }
  assert.equal(progress.getSubtitle(NaN), "□□□□□□□□□□ 0%");
  assert.equal(progress.getSubtitle(150), "■■■■■■■■■■ 100%");
});

test("defaults use a fresh clock on repeated calls and roll all calendar intervals forward", () => {
  let now = new Date(2026, 11, 31, 12).getTime();
  class ClockDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
  }
  const live = createLoader({ Date: ClockDate })("utils/progress.ts");
  const first = live.getDefaultProgress();
  assert.equal(item(first, "day").progressNum, 50);
  now = new Date(2026, 11, 31, 18).getTime();
  assert.equal(item(live.getDefaultProgress(), "day").progressNum, 75);
  now = new Date(2027, 0, 1).getTime();
  const next = live.getDefaultProgress();
  assert.equal(item(next, "year").startDate, now);
  assert.equal(item(next, "quarter").startDate, now);
  assert.equal(item(next, "month").startDate, now);
  assert.equal(item(next, "day").progressNum, 0);
  assert.equal(item(first, "day").progressNum, 50);
  assert.deepEqual(
    Array.from(next, (value) => value.pinned),
    [true, true, false, false, false]
  );
  assert.ok(next.every((value) => value.menubar.shown && !value.showAsCommand));
});

test("week interval follows the supplied preference on every call", () => {
  const now = new Date(2026, 9, 7, 12);
  const sunday = item(progress.getDefaultProgress(now, 0), "week");
  const monday = item(progress.getDefaultProgress(now, 1), "week");
  assert.equal(sunday.startDate, new Date(2026, 9, 4).getTime());
  assert.equal(monday.startDate, new Date(2026, 9, 5).getTime());
  assert.equal(monday.endDate, new Date(2026, 9, 12).getTime());
});

test("day interval respects DST rather than assuming 24 hours", () => {
  const helper = path.resolve(__dirname, "helpers.cjs");
  const output = execFileSync(
    process.execPath,
    [
      "-e",
      `
    const { createLoader } = require(${JSON.stringify(helper)});
    const progress = createLoader()("utils/progress.ts");
    const day = progress.getDefaultProgress(new Date(2024, 2, 10, 12)).find(p => p.id === "default:day");
    console.log(JSON.stringify({ duration: day.endDate - day.startDate, percent: day.progressNum }));
  `,
    ],
    { env: { ...process.env, TZ: "America/New_York" }, encoding: "utf8" }
  );
  assert.deepEqual(JSON.parse(output), { duration: 23 * 60 * 60 * 1000, percent: 47 });
});
