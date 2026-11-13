import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_BREAK_MINUTES,
  MAX_HOURS,
  isValidTimestamp,
  resolveTimerEndTime,
  validateBreakMinutes,
  validateHours,
} from "../src/duration.ts";

test("validateHours rejects a safe integer large enough to overflow Date", () => {
  const hours = String(Number.MAX_SAFE_INTEGER);
  assert.equal(typeof validateHours(hours), "string");
});

test("validateBreakMinutes rejects a safe integer large enough to overflow Date", () => {
  const minutes = String(Number.MAX_SAFE_INTEGER);
  assert.equal(typeof validateBreakMinutes(minutes), "string");
});

test("validateHours accepts a typical workday and the documented maximum", () => {
  assert.equal(validateHours("8"), undefined);
  assert.equal(validateHours(String(MAX_HOURS)), undefined);
});

test("validateBreakMinutes accepts a typical break and the documented maximum", () => {
  assert.equal(validateBreakMinutes("30"), undefined);
  assert.equal(validateBreakMinutes(String(MAX_BREAK_MINUTES)), undefined);
});

test("isValidTimestamp rejects values outside the ECMAScript Date range", () => {
  assert.equal(isValidTimestamp(Date.now()), true);
  assert.equal(isValidTimestamp(8.64e15), true);
  assert.equal(isValidTimestamp(8.64e15 + 1), false);
});

test("resolveTimerEndTime throws when the expiration would be an invalid Date", () => {
  const startTime = Date.now();
  const hugeMinutes = Number.MAX_SAFE_INTEGER;
  assert.throws(() => resolveTimerEndTime(startTime, hugeMinutes, 0), /Invalid timer duration/);
  assert.throws(() => resolveTimerEndTime(startTime, 8 * 60, hugeMinutes), /Invalid timer duration/);
});

test("resolveTimerEndTime returns a valid Date timestamp for a normal workday", () => {
  const startTime = Date.UTC(2026, 8, 11, 9, 0, 0);
  const endTime = resolveTimerEndTime(startTime, 8 * 60, 30);
  assert.equal(isValidTimestamp(endTime), true);
  assert.equal(endTime, startTime + (8 * 60 + 30) * 60_000);
  assert.equal(Number.isNaN(new Date(endTime).getTime()), false);
});
