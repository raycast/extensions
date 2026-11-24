import assert from "node:assert/strict";
import test from "node:test";
import { formatInputTime, parseLocalDateTime } from "../src/lib/date-time-input";
import { getDurationSeconds } from "../src/lib/duration";

test("combines a local date and a minute-precision time", () => {
  const result = parseLocalDateTime(new Date(2026, 9, 15, 18, 42), "09:05");
  assert.deepEqual(result.value, new Date(2026, 9, 15, 9, 5));
  assert.equal(formatInputTime(result.value!), "09:05");
});

test("preserves seconds and milliseconds when the displayed date and time are unchanged", () => {
  const original = new Date(2026, 9, 15, 9, 30, 47, 123);
  const result = parseLocalDateTime(new Date(2026, 9, 15), "09:30", original);
  assert.deepEqual(result.value, original);
  assert.notEqual(result.value, original);
});

test("changing the minute or date resets seconds without altering the other endpoint", () => {
  const original = new Date(2026, 9, 15, 9, 30, 47, 123);
  assert.deepEqual(parseLocalDateTime(new Date(2026, 9, 15), "09:31", original).value, new Date(2026, 9, 15, 9, 31));
  assert.deepEqual(parseLocalDateTime(new Date(2026, 9, 14), "09:30", original).value, new Date(2026, 9, 14, 9, 30));
  const end = new Date(2026, 9, 15, 11, 5, 12, 456);
  assert.deepEqual(parseLocalDateTime(new Date(2026, 9, 15), "11:05", end).value, end);
});

test("rejects empty, invalid and out-of-range inputs with field errors", () => {
  const date = new Date(2026, 9, 15);
  for (const time of ["", "9:30", "24:00", "09:75", "-1:00", "09:30:00", " 09:30 "]) {
    const result = parseLocalDateTime(date, time);
    assert.equal(result.value, undefined);
    assert.ok(result.timeError, time);
  }
  assert.ok(parseLocalDateTime(null, "09:30").dateError);
  assert.ok(parseLocalDateTime(new Date(NaN), "09:30").dateError);
  const missing = parseLocalDateTime(null, "");
  assert.ok(missing.dateError);
  assert.ok(missing.timeError);
});

test("handles midnight and a cross-day interval", () => {
  const start = parseLocalDateTime(new Date(2026, 9, 14), "23:45").value!;
  const end = parseLocalDateTime(new Date(2026, 9, 15), "00:15").value!;
  assert.equal(getDurationSeconds(start, end), 30 * 60);
  assert.deepEqual(parseLocalDateTime(new Date(2026, 9, 15), "00:00").value, new Date(2026, 9, 15));
});

test("rejects skipped daylight-saving times and preserves an unchanged repeated time", () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = "America/New_York";
  try {
    assert.ok(parseLocalDateTime(new Date(2026, 2, 8), "02:30").timeError);
    const secondOccurrence = new Date("2026-11-01T06:30:47.123Z");
    assert.equal(formatInputTime(secondOccurrence), "01:30");
    assert.deepEqual(parseLocalDateTime(new Date(2026, 10, 1), "01:30", secondOccurrence).value, secondOccurrence);
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});
