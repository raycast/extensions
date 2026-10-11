import assert from "node:assert/strict";
import test from "node:test";
import { createLatestRequestGuard } from "../src/request-utils.js";

test("accepts results only from the latest asynchronous request", () => {
  const guard = createLatestRequestGuard();
  const isFirstRequestLatest = guard.begin();
  const isSecondRequestLatest = guard.begin();

  assert.equal(isFirstRequestLatest(), false);
  assert.equal(isSecondRequestLatest(), true);
});
