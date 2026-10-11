import assert from "node:assert/strict";
import { searchShortcuts, tokenizeSearchQuery } from "../src/lib/shortcut-search";
import type { Shortcut } from "../src/types/shortcut";

const shortcuts: Shortcut[] = [
  {
    id: "next-tab",
    commandName: "Next Tab",
    modifiers: ["command"],
    key: "→",
    shortcutDisplay: "⌘ + →",
    ownerName: "Safari",
    ownerType: "mac-app",
    scope: "app",
    sourceType: "default",
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
  },
  {
    id: "dismiss",
    commandName: "Dismiss Dialog",
    modifiers: [],
    key: "Esc",
    shortcutDisplay: "Esc",
    ownerName: "Raycast",
    ownerType: "mac-app",
    scope: "app",
    sourceType: "default",
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
  },
  {
    id: "command-palette",
    commandName: "Command Palette",
    modifiers: ["command", "shift"],
    key: "P",
    shortcutDisplay: "⌘ + ⇧ + P",
    ownerName: "VS Code",
    ownerType: "mac-app",
    scope: "app",
    sourceType: "default",
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
  },
  {
    id: "submit-form",
    commandName: "Submit Form",
    modifiers: ["command"],
    key: "Enter",
    shortcutDisplay: "⌘ + Enter",
    ownerName: "Raycast",
    ownerType: "mac-app",
    scope: "app",
    sourceType: "default",
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
  },
  {
    id: "zoom-in",
    commandName: "Zoom In",
    modifiers: ["command"],
    key: "+",
    shortcutDisplay: "⌘ + +",
    ownerName: "Safari",
    ownerType: "mac-app",
    scope: "app",
    sourceType: "default",
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
  },
  {
    id: "delete-row",
    commandName: "Delete Row",
    modifiers: ["command"],
    key: "Delete",
    shortcutDisplay: "⌘ + Delete",
    ownerName: "Excel",
    ownerType: "mac-app",
    scope: "app",
    sourceType: "default",
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
  },
  {
    id: "delete-char",
    commandName: "Erase Left",
    modifiers: [],
    key: "Backspace",
    shortcutDisplay: "Backspace",
    ownerName: "System",
    ownerType: "other",
    scope: "global",
    sourceType: "custom",
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
  },
  {
    id: "center-align",
    commandName: "Center Align",
    modifiers: ["command"],
    key: "E",
    shortcutDisplay: "⌘ + E",
    ownerName: "Pages",
    ownerType: "mac-app",
    scope: "app",
    sourceType: "default",
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
  },
];

assert.deepEqual(tokenizeSearchQuery("cmd right"), ["command", "right"]);
assert.deepEqual(searchShortcuts(shortcuts, "cmd right").map((shortcut) => shortcut.id), ["next-tab"]);
assert.deepEqual(searchShortcuts(shortcuts, "right arrow").map((shortcut) => shortcut.id), ["next-tab"]);
assert.deepEqual(searchShortcuts(shortcuts, "escape").map((shortcut) => shortcut.id), ["dismiss"]);
assert.deepEqual(searchShortcuts(shortcuts, "esc").map((shortcut) => shortcut.id), ["dismiss"]);
assert.deepEqual(tokenizeSearchQuery("enter"), ["return", "enter"]);
assert.deepEqual(tokenizeSearchQuery("return"), ["return", "enter"]);
assert.deepEqual(searchShortcuts(shortcuts, "enter").map((shortcut) => shortcut.id), ["submit-form"]);
assert.deepEqual(searchShortcuts(shortcuts, "return").map((shortcut) => shortcut.id), ["submit-form"]);
assert.deepEqual(searchShortcuts(shortcuts, "center").map((shortcut) => shortcut.id), ["center-align"]);
assert.deepEqual(searchShortcuts(shortcuts, "cmd shift p").map((shortcut) => shortcut.id), ["command-palette"]);

// Either/or del alias regressions
assert.deepEqual(tokenizeSearchQuery("del"), ["del"]);
assert.deepEqual(searchShortcuts(shortcuts, "del").map((shortcut) => shortcut.id).sort(), ["delete-char", "delete-row"]);
assert.deepEqual(searchShortcuts(shortcuts, "del row").map((shortcut) => shortcut.id), ["delete-row"]);
assert.deepEqual(searchShortcuts(shortcuts, "delete").map((shortcut) => shortcut.id), ["delete-row"]);
assert.deepEqual(searchShortcuts(shortcuts, "backspace").map((shortcut) => shortcut.id), ["delete-char"]);

// Literal + search regressions
assert.deepEqual(tokenizeSearchQuery("+"), ["plus"]);
assert.deepEqual(tokenizeSearchQuery("cmd +"), ["command", "plus"]);
assert.deepEqual(tokenizeSearchQuery("cmd + +"), ["command", "plus"]);
assert.deepEqual(tokenizeSearchQuery("cmd + p"), ["command", "p"]);
assert.deepEqual(tokenizeSearchQuery("cmd+p"), ["command", "p"]);

assert.deepEqual(searchShortcuts(shortcuts, "+").map((shortcut) => shortcut.id), ["zoom-in"]);
assert.deepEqual(searchShortcuts(shortcuts, "cmd +").map((shortcut) => shortcut.id), ["zoom-in"]);
assert.deepEqual(searchShortcuts(shortcuts, "cmd + +").map((shortcut) => shortcut.id), ["zoom-in"]);
assert.deepEqual(searchShortcuts(shortcuts, "cmd + p").map((shortcut) => shortcut.id), ["command-palette"]);
assert.deepEqual(searchShortcuts(shortcuts, "zoom +").map((shortcut) => shortcut.id), ["zoom-in"]);

console.log("shortcut search tests passed");
