import assert from "node:assert/strict";
import { test } from "node:test";
import { linkShortcuts, parseShortcut } from "../src/shortcuts";

test("custom shortcut accepts normalized modifiers and Backspace", () => {
  assert.deepEqual(parseShortcut(" shift + Control + n "), {
    shortcut: { modifiers: ["ctrl", "shift"], key: "n" },
    label: "Ctrl+Shift+N",
  });
  assert.deepEqual(parseShortcut("Alt+Backspace").shortcut, {
    modifiers: ["alt"],
    key: "backspace",
  });
});
test("rejects invalid, repeated, plain typing and editing shortcuts", () => {
  for (const value of [
    "N",
    "Shift+N",
    "Ctrl+Ctrl+N",
    "Ctrl+Enter",
    "Ctrl+",
    "Ctrl+C",
    "Meta+N",
  ])
    assert.throws(() => parseShortcut(value));
});
test("invalid or identical shortcuts fall back safely; valid settings override defaults", () => {
  assert.equal(linkShortcuts().add.label, "Ctrl+N");
  const same = linkShortcuts("Alt+N", "Alt+N");
  assert.ok(same.warning);
  assert.equal(same.remove.label, "Ctrl+Shift+Backspace");
  assert.equal(linkShortcuts("Alt+N", "Alt+Backspace").warning, "");
});
