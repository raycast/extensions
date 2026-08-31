import assert from "node:assert/strict";
import test from "node:test";
import { runAppleShortcut } from "./apple-shortcuts.ts";

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
