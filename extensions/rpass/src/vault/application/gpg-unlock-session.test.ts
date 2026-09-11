import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  createGpgUnlockSession,
  forgetStoreUnlock,
  markStoreUnlocked,
  resetUnlockSessionForTests,
  shouldTryAgentUnlock,
} from "./gpg-unlock-session";

beforeEach(() => {
  resetUnlockSessionForTests();
});

test("stores start without an optimistic unlock marker", () => {
  assert.equal(shouldTryAgentUnlock("/tmp/store"), false);
});

test("successful unlock marks a store for optimistic agent reuse", () => {
  markStoreUnlocked("/tmp/store");

  assert.equal(shouldTryAgentUnlock("/tmp/store"), true);
});

test("forgetting a store clears optimistic agent reuse", () => {
  markStoreUnlocked("/tmp/store");
  forgetStoreUnlock("/tmp/store");

  assert.equal(shouldTryAgentUnlock("/tmp/store"), false);
});

test("store keys are trimmed without exposing passphrases", () => {
  markStoreUnlocked(" /tmp/store ");

  assert.equal(shouldTryAgentUnlock("/tmp/store"), true);
});

test("unlock markers expire", () => {
  let now = 1000;
  const storage = new Map<string, string>();
  const session = createGpgUnlockSession({
    now: () => now,
    ttlMs: 500,
    storage: {
      get: (key) => storage.get(key),
      set: (key, value) => storage.set(key, value),
      remove: (key) => storage.delete(key),
    },
  });

  session.markStoreUnlocked("/tmp/store");
  assert.equal(session.shouldTryAgentUnlock("/tmp/store"), true);

  now = 1501;
  assert.equal(session.shouldTryAgentUnlock("/tmp/store"), false);
  assert.equal(storage.size, 0);
});
