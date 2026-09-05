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
];

assert.deepEqual(tokenizeSearchQuery("cmd right"), ["command", "right"]);
assert.deepEqual(searchShortcuts(shortcuts, "cmd right").map((shortcut) => shortcut.id), ["next-tab"]);
assert.deepEqual(searchShortcuts(shortcuts, "right arrow").map((shortcut) => shortcut.id), ["next-tab"]);
assert.deepEqual(searchShortcuts(shortcuts, "escape").map((shortcut) => shortcut.id), ["dismiss"]);
assert.deepEqual(searchShortcuts(shortcuts, "esc").map((shortcut) => shortcut.id), ["dismiss"]);
assert.deepEqual(searchShortcuts(shortcuts, "enter").map((shortcut) => shortcut.id), ["submit-form"]);
assert.deepEqual(searchShortcuts(shortcuts, "return").map((shortcut) => shortcut.id), ["submit-form"]);
assert.deepEqual(searchShortcuts(shortcuts, "cmd shift p").map((shortcut) => shortcut.id), ["command-palette"]);

console.log("shortcut search tests passed");
