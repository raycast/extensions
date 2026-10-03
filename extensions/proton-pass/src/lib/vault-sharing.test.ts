import test from "node:test";
import assert from "node:assert/strict";
import { sharedVaultTooltip, withSharing } from "./vault-sharing";
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

test("vaults get their sharing, or keep what was known before when it's missing", () => {
  const vaults = [
    { shareId: "personal", name: "Personal" },
    { shareId: "work", name: "Work" },
    { shareId: "family", name: "Family" },
  ];
  const previous = [
    { shareId: "work", name: "Work", role: "owner" as const, isShared: true },
    { shareId: "family", name: "Family", role: "viewer" as const, isShared: true },
  ];
  const sharing = new Map<string, VaultSharing>([
    ["personal", { role: "owner", isShared: false }],
    // The members of this vault couldn't be counted.
    ["work", { role: "owner" }],
  ]);

  assert.deepEqual(withSharing(vaults, sharing, previous), [
    { shareId: "personal", name: "Personal", role: "owner", isShared: false },
    { shareId: "work", name: "Work", role: "owner", isShared: true },
    { shareId: "family", name: "Family", role: "viewer", isShared: true },
  ]);
  assert.deepEqual(withSharing(vaults, undefined, previous), [
    { shareId: "personal", name: "Personal", role: undefined, isShared: undefined },
    ...previous,
  ]);
});
