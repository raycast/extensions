import assert from "node:assert/strict";
import test from "node:test";

import { formatLinearProgress } from "./linear-progress.ts";

test("formatLinearProgress renders empty bar at 0%", () => {
  assert.equal(formatLinearProgress(0, 10), "[----------] 0%");
});

test("formatLinearProgress renders full bar at 100%", () => {
  assert.equal(formatLinearProgress(1, 10), "[##########] 100%");
});

test("formatLinearProgress clamps progress to range and rounds percent", () => {
  assert.equal(formatLinearProgress(0.456, 10), "[#####-----] 46%");
  assert.equal(formatLinearProgress(-0.2, 10), "[----------] 0%");
  assert.equal(formatLinearProgress(1.8, 10), "[##########] 100%");
});
