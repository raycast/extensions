import test from "node:test";
import assert from "node:assert/strict";
import { countItemsByVault } from "./item-counts";
import { mergeRefreshedItems } from "./refresh";
import { SHARED_WITH_ME, withoutDuplicates } from "./shared-items";
import { Item } from "./types";

const inVault: Item = {
  shareId: "vault",
  itemId: "in-vault",
  title: "Example",
  type: "login",
  vaultName: "Personal",
  hasTotp: false,
};
const shared: Item = {
  ...inVault,
  shareId: "item-share",
  itemId: "shared",
  vaultName: "Shared with Me",
  sharedWithMe: true,
};

test("items shared one by one count under Shared with Me, not under their own share", () => {
  const counts = countItemsByVault([{ shareId: "vault" }, SHARED_WITH_ME], [inVault, shared]);
  assert.deepEqual(
    [...counts],
    [
      ["vault", 1],
      [SHARED_WITH_ME.shareId, 1],
    ],
  );
});

test("Shared with Me failing to load keeps the shared items known already", () => {
  assert.deepEqual(mergeRefreshedItems([inVault], [inVault, shared], [SHARED_WITH_ME.shareId]), [inVault, shared]);
});

test("an item also in one of the user's vaults is listed with that vault only", () => {
  const sharedCopy = { ...shared, itemId: inVault.itemId };
  assert.deepEqual(withoutDuplicates([sharedCopy, inVault, shared]), [inVault, shared]);
});
