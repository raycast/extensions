import test from "node:test";
import assert from "node:assert/strict";
import {
  compareCanonicalDateStrings,
  formatTaskDate,
  fromCanonicalDateString,
  toCanonicalDateString,
} from "../src/lib/date";

test("toCanonicalDateString stores local calendar dates as YYYY-MM-DD", () => {
  const value = new Date(2026, 3, 10, 15, 45, 0, 0);

  assert.equal(toCanonicalDateString(value), "2026-04-10");
});

test("fromCanonicalDateString round-trips calendar-only values in local time", () => {
  const parsed = fromCanonicalDateString("2026-04-10");

  assert.ok(parsed);
  assert.equal(parsed?.getFullYear(), 2026);
  assert.equal(parsed?.getMonth(), 3);
  assert.equal(parsed?.getDate(), 10);
  assert.equal(parsed?.getHours(), 0);
  assert.equal(parsed?.getMinutes(), 0);
});

test("fromCanonicalDateString still accepts legacy ISO timestamps", () => {
  const parsed = fromCanonicalDateString("2026-04-10T15:45:00.000Z");

  assert.ok(parsed);
  assert.equal(parsed?.toISOString(), "2026-04-10T15:45:00.000Z");
});

test("formatTaskDate renders date-only and legacy timestamp values correctly", () => {
  assert.equal(formatTaskDate("2026-04-10"), "Apr 10, 2026");
  assert.equal(
    formatTaskDate(new Date(2026, 3, 10, 15, 45, 0, 0).toISOString()),
    "Apr 10, 2026 3:45 PM",
  );
});

test("compareCanonicalDateStrings compares mixed legacy and date-only values by calendar day", () => {
  assert.ok(
    compareCanonicalDateStrings("2026-04-02", "2026-04-03T07:00:00.000Z") < 0,
  );
  assert.equal(
    compareCanonicalDateStrings("2026-04-03", "2026-04-03T07:00:00.000Z"),
    0,
  );
});
