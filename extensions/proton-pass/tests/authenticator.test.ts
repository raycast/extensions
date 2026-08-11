import assert from "node:assert/strict";
import test from "node:test";
import { createAuthenticator } from "../src/authenticator/authenticator";
import type { ItemSummary } from "../src/items/item";

test("lists only login items whose metadata reports TOTP", () => {
  const module = createAuthenticator({ generateTotpCode: async () => "123456" });
  const items: ItemSummary[] = [
    { shareId: "s", itemId: "login", vaultName: "Main", title: "Login", type: "login" },
    { shareId: "s", itemId: "alias", vaultName: "Main", title: "Alias", type: "alias" },
  ];
  assert.deepEqual(
    module.listCandidates(items, {
      "s:login": { urls: [], hasTotp: true },
      "s:alias": { urls: [], hasTotp: true },
    }),
    [items[0]],
  );
});

test("generates a code through the configured source", async () => {
  const module = createAuthenticator({ generateTotpCode: async ({ itemId }) => `code-${itemId}` });
  assert.equal(await module.generateCode({ shareId: "s", itemId: "login" }), "code-login");
});
