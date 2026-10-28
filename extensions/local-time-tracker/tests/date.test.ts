import assert from "node:assert/strict";
import test from "node:test";
import { getOverlapDurationSeconds, getStartOfMonth, getStartOfToday, getStartOfWeek } from "../src/lib/date";

test("counts only the overlap across midnight", () => {
  const seconds = getOverlapDurationSeconds(
    "2026-09-22T14:30:00.000Z",
    "2026-09-22T15:30:00.000Z",
    "2026-09-22T15:00:00.000Z",
    "2026-09-23T15:00:00.000Z",
  );
  assert.equal(seconds, 30 * 60);
});

test("returns zero when a log does not overlap", () => {
  const seconds = getOverlapDurationSeconds(
    "2026-09-20T00:00:00.000Z",
    "2026-09-20T01:00:00.000Z",
    "2026-09-21T00:00:00.000Z",
    "2026-09-22T00:00:00.000Z",
  );
  assert.equal(seconds, 0);
});

test("uses Monday as the start of the week", () => {
  const now = new Date(2026, 8, 23, 12, 0, 0);
  const start = getStartOfWeek(now);
  assert.equal(start.getDay(), 1);
  assert.equal(start.getDate(), 21);
  assert.equal(start.getHours(), 0);
});

test("creates local day and month boundaries", () => {
  const now = new Date(2026, 8, 23, 12, 34, 56);
  assert.deepEqual(getStartOfToday(now), new Date(2026, 8, 23));
  assert.deepEqual(getStartOfMonth(now), new Date(2026, 8, 1));
});

test("rejects an invalid log range", () => {
  assert.throws(() =>
    getOverlapDurationSeconds(
      "2026-09-23T02:00:00.000Z",
      "2026-09-23T01:00:00.000Z",
      "2026-09-23T00:00:00.000Z",
      "2026-09-24T00:00:00.000Z",
    ),
  );
});
