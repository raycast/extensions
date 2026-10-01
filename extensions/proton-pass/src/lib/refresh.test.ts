import test from "node:test";
import assert from "node:assert/strict";
import { createRequestTracker, failedVaultsTitle, mergeRefreshedItems } from "./refresh";
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
