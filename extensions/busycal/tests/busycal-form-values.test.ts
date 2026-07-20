import assert from "node:assert/strict";
import test from "node:test";
import { busyCalDateString } from "../src/busycal-form-values";

test("busyCalDateString formats all-day dates as yyyy-MM-dd", () => {
  const date = new Date(Date.UTC(2026, 2, 19, 15, 45, 30));
  const formatted = busyCalDateString(date, true);

  assert.match(formatted, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(formatted, "2026-03-19");
});

test("busyCalDateString formats timed dates with a timezone offset", () => {
  const date = new Date(2026, 2, 19, 10, 30, 45);
  const formatted = busyCalDateString(date, false);
  const expectedOffset = formatOffset(date);

  assert.match(
    formatted,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
  );
  assert.ok(formatted.endsWith(expectedOffset));
});

test("busyCalDateString preserves local wall-clock components for timed values", () => {
  const date = new Date(2026, 2, 19, 10, 30, 45);
  const formatted = busyCalDateString(date, false);

  assert.ok(formatted.startsWith("2026-03-19T10:30:45"));
});

function formatOffset(date: Date): string {
  const timezoneOffsetMinutes = -date.getTimezoneOffset();
  const sign = timezoneOffsetMinutes >= 0 ? "+" : "-";
  const absoluteOffsetMinutes = Math.abs(timezoneOffsetMinutes);
  const hours = `${Math.floor(absoluteOffsetMinutes / 60)}`.padStart(2, "0");
  const minutes = `${absoluteOffsetMinutes % 60}`.padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}
