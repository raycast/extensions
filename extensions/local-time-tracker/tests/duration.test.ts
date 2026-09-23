import assert from "node:assert/strict";
import test from "node:test";
import { formatDuration, getDurationSeconds } from "../src/lib/duration";

test("calculates duration from timestamps", () => {
  assert.equal(getDurationSeconds("2026-09-23T00:00:00.000Z", "2026-09-23T01:03:00.000Z"), 3780);
});

test("formats durations", () => {
  assert.equal(formatDuration(0), "0m");
  assert.equal(formatDuration(30), "<1m");
  assert.equal(formatDuration(60), "1m");
  assert.equal(formatDuration(3780), "1h 03m");
});

test("rejects negative duration", () => {
  assert.throws(() => getDurationSeconds("2026-09-23T02:00:00.000Z", "2026-09-23T01:00:00.000Z"));
});
