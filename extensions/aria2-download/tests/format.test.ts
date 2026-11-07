import assert from "node:assert/strict";
import test from "node:test";

import { formatEta } from "../src/lib/format.ts";

test("metadata length reports waiting, not done", () => {
  assert.equal(formatEta("0", "0", "0"), "waiting");
});

test("completed task reports done", () => {
  assert.equal(formatEta("100", "100", "10"), "done");
});

test("active task reports remaining time", () => {
  assert.equal(formatEta("100", "50", "10"), "5s");
});
