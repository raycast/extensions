import assert from "node:assert/strict";
import test from "node:test";

import { activeMusicTrackStatus } from "./music-state";

test("describes the current track without implying paused music is audible", () => {
  assert.equal(activeMusicTrackStatus(true), "Playing");
  assert.equal(activeMusicTrackStatus(false), "Selected");
});
