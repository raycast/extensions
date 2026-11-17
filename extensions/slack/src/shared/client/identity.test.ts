import assert from "node:assert/strict";
import test from "node:test";
import { identityCacheKey, identityForAccount, loadAccountIdentity } from "./identity";
import { mergeVisitedDirectoryItems, visitedDirectoryItemsForWorkspace } from "./directory";

test("identity cache is isolated by credential without storing the token in its key", () => {
  const key = identityCacheKey("xoxp-first-account");
  assert.equal(key, identityCacheKey("xoxp-first-account"));
  assert.notEqual(key, identityCacheKey("xoxp-second-account"));
  assert.equal(key?.includes("xoxp-first-account"), false);
  assert.equal(identityCacheKey(undefined), undefined);
  assert.equal(identityCacheKey(""), undefined);
});

test("a failed refresh leaves the last successful identity usable and a later retry can succeed", async () => {
  const key = identityCacheKey("xoxp-first-account");
  const cached = await loadAccountIdentity(key, async () => ({ id: "U1", teamId: "T1", username: "alice" }));
  await assert.rejects(
    loadAccountIdentity(key, async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
  assert.equal(identityForAccount(cached, key)?.teamId, "T1");
  const retried = await loadAccountIdentity(key, async () => ({ id: "U1", teamId: "T1", username: "updated" }));
  assert.equal(identityForAccount(retried, key)?.username, "updated");
});

test("previous or late identity results cannot be used after switching accounts or signing out", async () => {
  const firstKey = identityCacheKey("xoxp-first-account");
  const otherKey = identityCacheKey("xoxp-second-account");
  const cached = await loadAccountIdentity(firstKey, async () => ({ id: "U1", teamId: "T1" }));
  assert.equal(identityForAccount(cached, otherKey), undefined);
  assert.equal(identityForAccount(cached, undefined), undefined);
  assert.equal(identityForAccount(undefined, firstKey), undefined);
});

test("unsuccessful identity responses cannot overwrite a complete cached identity", async () => {
  const key = identityCacheKey("xoxp-first-account");
  await assert.rejects(
    loadAccountIdentity(key, async () => ({ id: "U1" })),
    /workspace IDs/,
  );
  await assert.rejects(
    loadAccountIdentity(key, async () => ({ teamId: "T1" })),
    /workspace IDs/,
  );
  await assert.rejects(
    loadAccountIdentity(undefined, async () => {
      assert.fail("must not load without credentials");
    }),
    /Sign in/,
  );
});

test("directory results remain available without a workspace identity while account-specific recents stay hidden", () => {
  const channels = [{ id: "C1", name: "general", teamId: "T1", icon: "channel-public.png" }];
  const recents = [{ id: "C2", name: "private", teamId: "T2", icon: "channel-private.png" }];
  assert.deepEqual(
    mergeVisitedDirectoryItems(channels, visitedDirectoryItemsForWorkspace(recents, undefined), ""),
    channels,
  );
});
