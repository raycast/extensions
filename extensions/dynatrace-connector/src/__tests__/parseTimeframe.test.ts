// src/__tests__/parseTimeframe.test.ts
// Unit tests for timeframe parsing utility.

import { parseTimeframe } from "../lib/utils/parseTimeframe";

test('"1h" parses to 1 hour window', () => {
  const before = Date.now();
  const result = parseTimeframe("1h");
  const after = Date.now();

  const startMs = new Date(result.start).getTime();
  const endMs = new Date(result.end).getTime();

  expect(endMs).toBeGreaterThanOrEqual(before);
  expect(endMs).toBeLessThanOrEqual(after);
  expect(endMs - startMs).toBeCloseTo(3_600_000, -2); // ~1 hour, ±100ms tolerance
});

test('"30m" parses to 30 minute window', () => {
  const result = parseTimeframe("30m");
  const startMs = new Date(result.start).getTime();
  const endMs = new Date(result.end).getTime();
  expect(endMs - startMs).toBeCloseTo(30 * 60_000, -2);
});

test('"7d" parses to 7 day window', () => {
  const result = parseTimeframe("7d");
  const startMs = new Date(result.start).getTime();
  const endMs = new Date(result.end).getTime();
  expect(endMs - startMs).toBeCloseTo(7 * 24 * 3_600_000, -2);
});

test("empty string falls back to default 24h", () => {
  const result = parseTimeframe("");
  const startMs = new Date(result.start).getTime();
  const endMs = new Date(result.end).getTime();
  expect(endMs - startMs).toBeCloseTo(24 * 3_600_000, -2);
});

test("null falls back to default 24h", () => {
  const result = parseTimeframe(null);
  const startMs = new Date(result.start).getTime();
  const endMs = new Date(result.end).getTime();
  expect(endMs - startMs).toBeCloseTo(24 * 3_600_000, -2);
});

test("undefined falls back to default 24h", () => {
  const result = parseTimeframe(undefined);
  const startMs = new Date(result.start).getTime();
  const endMs = new Date(result.end).getTime();
  expect(endMs - startMs).toBeCloseTo(24 * 3_600_000, -2);
});

test("invalid string falls back to default 24h", () => {
  const result = parseTimeframe("foobar");
  const startMs = new Date(result.start).getTime();
  const endMs = new Date(result.end).getTime();
  expect(endMs - startMs).toBeCloseTo(24 * 3_600_000, -2);
});

test("plain number (e.g. '12') is treated as hours", () => {
  const result = parseTimeframe("12");
  const startMs = new Date(result.start).getTime();
  const endMs = new Date(result.end).getTime();
  expect(endMs - startMs).toBeCloseTo(12 * 3_600_000, -2);
});

test("returns ISO 8601 strings", () => {
  const result = parseTimeframe("1h");
  expect(result.start).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(result.end).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});
