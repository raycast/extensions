import test from "node:test";
import assert from "node:assert/strict";

test("formatRemainingPercent formats valid percentages", async () => {
  const { formatRemainingPercent } = await import("./percentage");

  assert.equal(formatRemainingPercent(5, 10), "50%");
  assert.equal(formatRemainingPercent(2, 3), "67%");
});

test("formatRemainingPercent returns '--' when limit is zero or invalid", async () => {
  const { formatRemainingPercent } = await import("./percentage");

  assert.equal(formatRemainingPercent(10, 0), "--");
  assert.equal(formatRemainingPercent(10, Number.NaN), "--");
  assert.equal(formatRemainingPercent(Number.NaN, 10), "--");
});
