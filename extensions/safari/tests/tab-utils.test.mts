import assert from "node:assert/strict";
import test from "node:test";
import { isStartPageTab } from "../src/tab-utils.ts";

test("hides Safari Start Page tabs regardless of URL", () => {
  assert.equal(isStartPageTab({ title: "Start Page" }), true);
});

test("keeps regular tabs", () => {
  assert.equal(isStartPageTab({ title: "Raycast Extensions" }), false);
});
