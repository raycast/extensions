import assert from "node:assert/strict";
import test from "node:test";
import { formatItemUrl, serializeItemReference } from "../src/items/item";
import { createPasswords } from "../src/passwords/passwords";
import { createSession } from "../src/session/session";
import { createVaults } from "../src/vaults/vaults";

test("formats item references for storage and links", () => {
  const reference = { shareId: "share", itemId: "item" };
  assert.equal(serializeItemReference(reference), "share:item");
  assert.equal(formatItemUrl(reference), "pass://share/item");
});

test("password module exposes password generation", async () => {
  const passwords = createPasswords({ generatePassword: async ({ length } = {}) => `length-${length}` });
  assert.equal(await passwords.generate({ length: 24 }), "length-24");
});

test("session module exposes the session status", async () => {
  const session = createSession({ getSessionStatus: async () => ({ state: "ready" as const }) });
  assert.deepEqual(await session.getStatus(), { state: "ready" });
});

test("vault module delegates every operation", async () => {
  const calls: string[] = [];
  const vault = { name: "Main", vaultId: "vault", shareId: "share" };
  const vaults = createVaults({
    async listVaults() { calls.push("list"); return [vault]; },
    async createVault(name) { calls.push(`create:${name}`); return vault; },
    async updateVault(_vault, name) { calls.push(`rename:${name}`); },
    async deleteVault() { calls.push("remove"); },
  });
  assert.deepEqual(await vaults.list(), [vault]);
  assert.equal(await vaults.create("New"), vault);
  await vaults.rename(vault, "Renamed");
  await vaults.remove(vault);
  assert.deepEqual(calls, ["list", "create:New", "rename:Renamed", "remove"]);
});
