import assert from "node:assert/strict";
import test from "node:test";
import { runAppleShortcut } from "./apple-shortcuts.ts";
import { escapeAppleScriptString } from "./apple-script.ts";

test("runs a Shortcut through Raycast's built-in Apple Shortcuts command", async () => {
  let launched;

  await runAppleShortcut("Turn Work On", async (command) => {
    launched = command;
  });

  assert.deepEqual(launched, {
    ownerOrAuthorName: "raycast",
    extensionName: "apple-shortcuts",
    name: "turn-work-on",
  });
});

test("escapes backslashes before quotes for AppleScript", () => {
  assert.equal(escapeAppleScriptString('App\\ "Name"'), 'App\\\\ \\"Name\\"');
});
