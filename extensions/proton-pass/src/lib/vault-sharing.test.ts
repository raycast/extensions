import test from "node:test";
import assert from "node:assert/strict";
import { mergeSharing, sharedVaultTooltip, withSharing } from "./vault-sharing";
import { VaultSharing } from "./types";

test("the tooltip says who shared the vault, with the user's role on vaults shared with them", () => {
  assert.equal(sharedVaultTooltip({ role: "owner", isShared: true }), "Shared by you");
  assert.equal(sharedVaultTooltip({ role: "owner", isShared: false }), undefined);
  assert.equal(sharedVaultTooltip({ role: "owner" }), undefined);
  assert.equal(sharedVaultTooltip({}), undefined);
  assert.equal(sharedVaultTooltip({ role: "manager", isShared: true }), "Shared with you · Manager");
  assert.equal(sharedVaultTooltip({ role: "editor", isShared: true }), "Shared with you · Editor");
  assert.equal(sharedVaultTooltip({ role: "viewer", isShared: true }), "Shared with you · Viewer");
});

test("listed sharing keeps what was saved only where members couldn't be counted, for the same role", () => {
  const saved = {
    work: { role: "owner", isShared: true },
    family: { role: "viewer", isShared: true },
    deleted: { role: "owner", isShared: true },
  } satisfies Record<string, VaultSharing>;
  const fresh = new Map<string, VaultSharing>([
    ["personal", { role: "owner", isShared: false }],
    // The members of these two vaults couldn't be counted; the user now owns the second one.
    ["work", { role: "owner" }],
    ["family", { role: "owner" }],
  ]);

  assert.deepEqual(mergeSharing(fresh, saved), {
    personal: { role: "owner", isShared: false },
    work: { role: "owner", isShared: true },
    family: { role: "owner", isShared: undefined },
  });
});

test("vaults get their sharing when it's known", () => {
  const vaults = [
    { shareId: "personal", name: "Personal" },
    { shareId: "family", name: "Family" },
  ];

  assert.deepEqual(withSharing(vaults, { family: { role: "viewer", isShared: true } }), [
    { shareId: "personal", name: "Personal" },
    { shareId: "family", name: "Family", role: "viewer", isShared: true },
  ]);
});
