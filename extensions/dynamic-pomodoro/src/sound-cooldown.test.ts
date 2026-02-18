import assert from "node:assert/strict";
import test from "node:test";
import { isCompletionSoundCooldownActive } from "./sound-cooldown.ts";

test("isCompletionSoundCooldownActive returns true when elapsed time is less than threshold", () => {
  assert.equal(isCompletionSoundCooldownActive({ now: 10_000, lastPlayedAt: 3_000, cooldownMs: 10_000 }), true);
});

test("isCompletionSoundCooldownActive returns false on exact boundary", () => {
  assert.equal(isCompletionSoundCooldownActive({ now: 20_000, lastPlayedAt: 10_000, cooldownMs: 10_000 }), false);
});

test("isCompletionSoundCooldownActive returns false when no previous timestamp", () => {
  assert.equal(isCompletionSoundCooldownActive({ now: 20_000, lastPlayedAt: undefined, cooldownMs: 10_000 }), false);
});
