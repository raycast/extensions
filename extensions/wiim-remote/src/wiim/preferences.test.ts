import { test } from "node:test";
import * as assert from "node:assert";

// Test the pure logic extracted from preferences.ts (not Raycast-dependent)

function clampVolumeStep(value: number): number {
  const parsed = isNaN(value) ? 5 : value;
  return Math.max(1, Math.min(50, parsed));
}

function parseCacheTime(raw: string | undefined): number {
  if (!raw) return 0;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function isCacheValidForTime(cachedAt: number, ttl = 30 * 60 * 1000): boolean {
  return cachedAt > 0 && Date.now() - cachedAt < ttl;
}

// Volume step clamping
test("clamps 0 to minimum 1", () => assert.strictEqual(clampVolumeStep(0), 1));
test("accepts minimum boundary 1", () => assert.strictEqual(clampVolumeStep(1), 1));
test("accepts mid value 25", () => assert.strictEqual(clampVolumeStep(25), 25));
test("accepts maximum boundary 50", () => assert.strictEqual(clampVolumeStep(50), 50));
test("clamps 51 to maximum 50", () => assert.strictEqual(clampVolumeStep(51), 50));
test("clamps 100 to maximum 50", () => assert.strictEqual(clampVolumeStep(100), 50));
test("clamps negative to minimum 1", () => assert.strictEqual(clampVolumeStep(-5), 1));
test("returns default 5 for NaN", () => assert.strictEqual(clampVolumeStep(NaN), 5));

// Cache time parsing
test("parseCacheTime returns 0 for undefined", () => assert.strictEqual(parseCacheTime(undefined), 0));
test("parseCacheTime parses valid timestamp", () => assert.strictEqual(parseCacheTime("1234567890"), 1234567890));
test("parseCacheTime returns 0 for non-numeric string", () => assert.strictEqual(parseCacheTime("abc"), 0));

// Cache validity
test("cache invalid when cachedAt is 0", () => assert.strictEqual(isCacheValidForTime(0), false));
test("cache valid when fresh (15 min ago)", () =>
  assert.strictEqual(isCacheValidForTime(Date.now() - 15 * 60 * 1000), true));
test("cache invalid when expired (31 min ago)", () =>
  assert.strictEqual(isCacheValidForTime(Date.now() - 31 * 60 * 1000), false));
test("cache invalid at exact boundary (30 min)", () =>
  assert.strictEqual(isCacheValidForTime(Date.now() - 30 * 60 * 1000), false));
