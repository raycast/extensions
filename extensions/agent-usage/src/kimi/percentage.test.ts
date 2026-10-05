import assert from "node:assert/strict";
import test from "node:test";

test("formatRemainingPercent formats valid percentages", async () => {
  const { formatRemainingPercent } = await import("./percentage.ts");

  assert.equal(formatRemainingPercent(5, 10, "remaining"), "50% remaining");
  assert.equal(formatRemainingPercent(2, 3, "remaining"), "67% remaining");
});

test("formatRemainingPercent flips to used in used mode", async () => {
  const { formatRemainingPercent } = await import("./percentage.ts");

  assert.equal(formatRemainingPercent(5, 10, "used"), "50% used");
  assert.equal(formatRemainingPercent(2, 3, "used"), "33% used");
});

test("formatRemainingPercent returns '--' when limit is zero or invalid", async () => {
  const { formatRemainingPercent } = await import("./percentage.ts");

  assert.equal(formatRemainingPercent(10, 0, "remaining"), "--");
  assert.equal(formatRemainingPercent(10, Number.NaN, "remaining"), "--");
  assert.equal(formatRemainingPercent(Number.NaN, 10, "remaining"), "--");
});

test("formatPercentShort follows the display mode", async () => {
  const { formatPercentShort } = await import("./percentage.ts");

  assert.equal(formatPercentShort(72, 100, "remaining"), "72%");
  assert.equal(formatPercentShort(72, 100, "used"), "28%");
  assert.equal(formatPercentShort(10, 0, "used"), "--");
});
