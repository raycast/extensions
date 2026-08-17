import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowCompactTranslation } from "../src/translation-display";

test("shows compact translations in the notification", () => {
  assert.equal(shouldShowCompactTranslation("собака"), true);
});

test("keeps expanded translations in the complete result view", () => {
  assert.equal(shouldShowCompactTranslation("x".repeat(141)), false);
});
