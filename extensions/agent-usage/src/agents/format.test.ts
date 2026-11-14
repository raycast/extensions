import assert from "node:assert/strict";
import test from "node:test";

import { formatClock, getRemainingPercent, getRemainingPercentOrNull, latestTimestamp } from "./format.ts";

test("latestTimestamp returns undefined when no timestamps are known", () => {
  assert.equal(latestTimestamp([undefined, undefined]), undefined);
});

test("latestTimestamp returns the most recent of the known timestamps", () => {
  assert.equal(latestTimestamp([10, undefined, 42, 7]), 42);
});

test("latestTimestamp ignores zero and negative timestamps", () => {
  assert.equal(latestTimestamp([0, -5, 42]), 42);
});

test("formatClock returns empty for a missing timestamp", () => {
  assert.equal(formatClock(undefined), "");
  assert.equal(formatClock(0), "");
});

test("formatClock renders a fetch timestamp as a local hour:minute clock time", () => {
  const ts = Date.parse("2026-07-06T09:30:00");
  assert.equal(formatClock(ts), new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  // Sanity: it's a non-empty, sub-second-free label (no ticking component).
  assert.ok(formatClock(ts).length > 0);
  assert.equal(formatClock(ts).includes(":"), true);
});

test("getRemainingPercentOrNull returns the clamped remaining percentage", () => {
  assert.equal(getRemainingPercentOrNull(5, 10), 50);
  assert.equal(getRemainingPercentOrNull(0, 10), 0);
  assert.equal(getRemainingPercentOrNull(10, 10), 100);
  assert.equal(getRemainingPercentOrNull(15, 10), 100);
  assert.equal(getRemainingPercentOrNull(-5, 10), 0);
});

test("getRemainingPercentOrNull returns null when the quota is unknown", () => {
  assert.equal(getRemainingPercentOrNull(10, 0), null);
  assert.equal(getRemainingPercentOrNull(10, -1), null);
  assert.equal(getRemainingPercentOrNull(10, Number.NaN), null);
  assert.equal(getRemainingPercentOrNull(Number.NaN, 10), null);
  assert.equal(getRemainingPercentOrNull(10, Number.POSITIVE_INFINITY), null);
});

test("getRemainingPercent treats an unknown quota as 0", () => {
  assert.equal(getRemainingPercent(5, 10), 50);
  assert.equal(getRemainingPercent(10, 0), 0);
  assert.equal(getRemainingPercent(Number.NaN, 10), 0);
});
