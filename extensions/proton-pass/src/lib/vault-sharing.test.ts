import test from "node:test";
import assert from "node:assert/strict";
import { sharedVaultTooltip } from "./vault-sharing";

test("only vaults shared with the user get a tooltip, with their role", () => {
  assert.equal(sharedVaultTooltip("owner"), undefined);
  assert.equal(sharedVaultTooltip(undefined), undefined);
  assert.equal(sharedVaultTooltip("manager"), "Shared with you · Manager");
  assert.equal(sharedVaultTooltip("editor"), "Shared with you · Editor");
  assert.equal(sharedVaultTooltip("viewer"), "Shared with you · Viewer");
});
