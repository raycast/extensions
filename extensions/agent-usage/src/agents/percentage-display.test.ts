import assert from "node:assert/strict";
import test from "node:test";

import { formatPercentDisplay, toDisplayPercent } from "./percentage-display.ts";

test("toDisplayPercent passes remaining through in remaining mode", () => {
  assert.equal(toDisplayPercent(58, "remaining"), 58);
  assert.equal(toDisplayPercent(0, "remaining"), 0);
  assert.equal(toDisplayPercent(100, "remaining"), 100);
});

test("toDisplayPercent inverts to used in used mode", () => {
  assert.equal(toDisplayPercent(58, "used"), 42);
  assert.equal(toDisplayPercent(0, "used"), 100);
  assert.equal(toDisplayPercent(100, "used"), 0);
});

test("toDisplayPercent avoids float artifacts and clamps in used mode", () => {
  assert.equal(toDisplayPercent(66.6, "used"), 33.4);
  assert.equal(toDisplayPercent(57.5, "used"), 42.5);
  assert.equal(toDisplayPercent(120, "used"), 0);
  assert.equal(toDisplayPercent(-5, "used"), 100);
});

test("formatPercentDisplay renders the mode word", () => {
  assert.equal(formatPercentDisplay(58, "remaining"), "58% remaining");
  assert.equal(formatPercentDisplay(58, "used"), "42% used");
});

test("formatPercentDisplay honors a custom number format", () => {
  assert.equal(
    formatPercentDisplay(57.5, "used", (v) => v.toFixed(1)),
    "42.5% used",
  );
});
