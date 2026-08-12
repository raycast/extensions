import assert from "node:assert/strict";
import test from "node:test";

import { AudioControl, audioControl } from "./audio-control";

test("maps every native AI audio control to an Elsewhere deep-link command", () => {
  const expected: Record<AudioControl, unknown> = {
    play: { kind: "experience", action: "play" },
    pause: { kind: "experience", action: "pause" },
    "ambience-louder": { kind: "volume", target: "ambience", delta: 10 },
    "ambience-quieter": { kind: "volume", target: "ambience", delta: -10 },
    "music-louder": { kind: "volume", target: "music", delta: 10 },
    "music-quieter": { kind: "volume", target: "music", delta: -10 },
    "background-music-on": { kind: "music", action: "on" },
    "background-music-off": { kind: "music", action: "off" },
  };

  for (const [control, command] of Object.entries(expected) as [AudioControl, unknown][]) {
    assert.deepEqual(audioControl(control).command, command);
  }
});
