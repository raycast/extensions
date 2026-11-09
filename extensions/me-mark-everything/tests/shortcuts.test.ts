import { test } from "node:test";
import assert from "node:assert/strict";
import { parseShortcut, resolveShortcuts } from "../src/helpers/shortcuts";

test("manifest defaults preserve existing action shortcuts", () => {
  assert.deepEqual(resolveShortcuts({}), {
    shortcutOpen: undefined, shortcutCopy: undefined,
    shortcutDetails: { modifiers: ["cmd", "shift"], key: "d" },
    shortcutEdit: { modifiers: ["cmd"], key: "e" },
    shortcutTrash: { modifiers: ["ctrl"], key: "x" },
    shortcutManager: undefined, shortcutRefresh: undefined, shortcutSave: undefined,
    shortcutAddUrl: { modifiers: ["ctrl", "shift"], key: "a" },
    shortcutRemoveUrl: { modifiers: ["ctrl", "shift"], key: "r" },
  });
});

test("custom modifiers, aliases and named keys normalize; none disables", () => {
  assert.deepEqual(parseShortcut(" SHIFT + Control + X "), { modifiers: ["ctrl", "shift"], key: "x" });
  assert.deepEqual(parseShortcut("option+arrowUp"), { modifiers: ["opt"], key: "arrowUp" });
  assert.equal(parseShortcut(" NONE "), undefined);
  assert.equal(parseShortcut(""), undefined);
  assert.equal(resolveShortcuts({ shortcutTrash: "none" }).shortcutTrash, undefined);
});

test("invalid or reserved combinations report the setting instead of falling back", () => {
  for (const value of ["x", "shift+x", "cmd+cmd+x", "ctrl+", "cmd+f1", "cmd+k", "cmd+,", "cmd+return", "cmd+shift+enter"]) {
    assert.throws(() => resolveShortcuts({ shortcutTrash: value }), /Shortcut: Move to Trash:/);
  }
});

test("coexisting actions cannot share a shortcut; edit and save can", () => {
  assert.throws(() => resolveShortcuts({ shortcutTrash: "cmd+e" }), /Edit in Raycast.*Move to Trash.*cmd\+e/);
  assert.throws(() => resolveShortcuts({ shortcutSave: "ctrl+x" }), /Save Bookmark.*Move to Trash/);
  assert.throws(() => resolveShortcuts({ shortcutOpen: "ctrl+backspace", shortcutCopy: "ctrl+delete" }), /both use ctrl\+delete/);
  assert.deepEqual(resolveShortcuts({ shortcutSave: "cmd+e" }).shortcutSave, { modifiers: ["cmd"], key: "e" });
});
