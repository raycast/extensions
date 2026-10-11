import assert from "node:assert/strict";
import test from "node:test";
import { NO_SHORTCUT, normalizeShortcutValue } from "./shortcut-values.ts";

test("normalizes Raycast dropdown and legacy shortcut values", () => {
  assert.equal(normalizeShortcutValue("  Start Work  "), "Start Work");
  assert.equal(normalizeShortcutValue(NO_SHORTCUT), undefined);
  assert.equal(normalizeShortcutValue({ value: "Start Work" }), "Start Work");
  assert.equal(normalizeShortcutValue({ title: NO_SHORTCUT }), undefined);
  assert.equal(normalizeShortcutValue(null), undefined);
});
