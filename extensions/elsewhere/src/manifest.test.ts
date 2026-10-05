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
      description: "Control spatial soundscapes, background music, playback, and volume.",
    },
    {
      name: "create-space-from-prompt",
      title: "Create Space from Prompt",
      description: "Create a spatial soundscape preview from a natural-language description to review before saving.",
    },
    {
      name: "switch-space",
      title: "Switch Spatial Soundscape",
      description: "Switch to an existing spatial soundscape by name.",
    },
    {
      name: "switch-background-music",
      title: "Switch Background Music",
      description: "Switch to an existing background music track by name.",
    },
  ]);
});
