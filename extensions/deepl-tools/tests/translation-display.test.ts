import assert from "node:assert/strict";
import test from "node:test";
import { previewText, shouldShowCompactTranslation } from "../src/translation-display";

test("shows compact translations in the notification", () => {
  assert.equal(shouldShowCompactTranslation("собака"), true);
  assert.equal(shouldShowCompactTranslation("x".repeat(105)), true);
  assert.equal(previewText("x".repeat(105)), "x".repeat(105));
});

test("keeps expanded translations in the complete result view", () => {
  assert.equal(shouldShowCompactTranslation("x".repeat(106)), false);
});
