import assert from "node:assert/strict";
import test from "node:test";

import manifest from "../package.json";

test("exposes focused Raycast commands instead of a monolithic control command", () => {
  assert.deepEqual(
    manifest.commands.map(({ name, mode }) => ({ name, mode })),
    [
      { name: "toggle-audio", mode: "no-view" },
      { name: "switch-space", mode: "view" },
      { name: "toggle-background-music", mode: "no-view" },
      { name: "switch-background-music", mode: "view" },
      { name: "ambience-louder", mode: "no-view" },
      { name: "ambience-quieter", mode: "no-view" },
      { name: "music-louder", mode: "no-view" },
      { name: "music-quieter", mode: "no-view" },
    ],
  );
  assert.equal(
    manifest.commands.some((command) => command.name === "control-elsewhere"),
    false,
  );
  assert.deepEqual(manifest.tools, [
    {
      name: "control-audio",
      title: "Control Audio",
      description:
        "Control Elsewhere audio directly in the background: play or pause audio, adjust ambience or music volume, or turn background music on or off. Use this native tool instead of Run Command, shell commands, AppleScript, or accessibility automation.",
    },
    {
      name: "create-space-from-prompt",
      title: "Create Space from Prompt",
      description:
        "Immediately start Glaze AI preview generation from the user's natural-language soundscape description. The user reviews and confirms in Elsewhere before a Space is created.",
    },
  ]);
});
