import assert from "node:assert/strict";
import test from "node:test";
import {
  findCreatedVault,
  getCommandTimeout,
  isTimeoutError,
  isVaultCreatedDespiteResponseError,
} from "../src/pass/cli-process";

test("allows item listing enough time for large vaults", () => {
  assert.equal(getCommandTimeout(["item", "list", "--share-id", "share-id"]), 30_000);
});

test("recognizes the empty timeout error reported by execFile", () => {
  const error = { killed: true, signal: "SIGTERM", code: null };
  assert.equal(isTimeoutError(error), true);
});

test("recognizes the CLI response parsing error reported after vault creation", () => {
  assert.equal(
    isVaultCreatedDespiteResponseError(
      "error creating vault Caused by: Error parsing response body: error in response: invalid type: null, expected struct OrganizationPasswordPolicy at line 1 column 186",
    ),
    true,
  );
  assert.equal(isVaultCreatedDespiteResponseError("error creating vault: permission denied"), false);
});

test("does not report creation when Proton did not persist the vault", () => {
  const existing = [{ name: "Personal", shareId: "existing" }];
  assert.equal(findCreatedVault(existing, existing, "Work"), undefined);
});

test("finds a newly persisted vault by name and share ID", () => {
  const before = [{ name: "Work", shareId: "old" }];
  const created = { name: "Work", shareId: "new" };
  assert.equal(findCreatedVault(before, [...before, created], "Work"), created);
});
