import test from "node:test";
import assert from "node:assert/strict";
import {
  createRequestTracker,
  createSerialQueue,
  failedVaultsTitle,
  getRefreshResult,
  mergeRefreshedItems,
} from "./refresh";
import { Item } from "./types";

function item(shareId: string, itemId: string): Item {
  return { shareId, itemId, title: itemId, type: "login", vaultName: shareId, hasTotp: false };
}

test("keeps the known items of vaults that failed to load", () => {
  const fresh = [item("vault-1", "a")];
  const previous = [item("vault-1", "old"), item("vault-2", "b"), item("vault-3", "c")];

  assert.deepEqual(
    mergeRefreshedItems(fresh, previous, ["vault-2"]).map(({ itemId }) => itemId),
    ["a", "b"],
  );
  assert.equal(mergeRefreshedItems(fresh, previous, []), fresh);
});

test("names the vaults that failed to load", () => {
  assert.equal(failedVaultsTitle(["Work"]), "Couldn't Load Work");
  assert.equal(failedVaultsTitle(["Work", "Family"]), "Couldn't Load 2 Vaults");
});

test("only the latest request is current", () => {
  const tracker = createRequestTracker();
  const first = tracker.start();
  assert.equal(first(), true);

  const second = tracker.start();
  assert.equal(first(), false);
  assert.equal(second(), true);
});

test("queued tasks run one after the other, in order", async () => {
  const queue = createSerialQueue();
  const events: string[] = [];
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const slow = queue.run(async () => {
    events.push("slow start");
    await wait(20);
    events.push("slow end");
  });
  const failing = queue.run(async () => {
    events.push("failing");
    throw new Error("write failed");
  });
  const fast = queue.run(async () => {
    events.push("fast");
    return 42;
  });

  await slow;
  await assert.rejects(failing, /write failed/);
  assert.equal(await fast, 42);
  assert.deepEqual(events, ["slow start", "slow end", "failing", "fast"]);
});

test("only a complete listing can renew the cache", () => {
  const fresh = [item("vault-1", "a")];
  const previous = [item("vault-1", "old"), item("vault-2", "b")];

  assert.deepEqual(getRefreshResult(fresh, previous, []), {
    items: fresh,
    isComplete: true,
    failureMessage: undefined,
  });

  const partial = getRefreshResult(fresh, previous, [{ vault: { shareId: "vault-2" }, message: "timeout" }]);
  assert.deepEqual(
    partial.items.map(({ itemId }) => itemId),
    ["a", "b"],
  );
  assert.equal(partial.isComplete, false);
  assert.equal(partial.failureMessage, undefined);
});

test("a failed listing with nothing to show is a failure, not an empty account", () => {
  const failures = [
    { vault: { shareId: "vault-1" }, message: "timeout" },
    { vault: { shareId: "vault-2" }, message: "network" },
  ];
  assert.equal(getRefreshResult([], [], failures).failureMessage, "timeout");

  // Get TOTP only shows items with a 2FA code.
  const withoutCodes = getRefreshResult([item("vault-3", "c")], [], failures, (candidate) => candidate.hasTotp);
  assert.equal(withoutCodes.failureMessage, "timeout");
});
