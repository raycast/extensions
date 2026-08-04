import test from "node:test";
import assert from "node:assert/strict";

import { formatClock, latestTimestamp } from "./format.ts";

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
