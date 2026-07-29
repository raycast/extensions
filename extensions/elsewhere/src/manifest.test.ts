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
});
