import test from "node:test";
import assert from "node:assert/strict";
import { normalizeItem } from "./pass-cli-normalize";

test("normalizes a scoped item list entry that omits the vault share id", () => {
  const item = normalizeItem(
    {
      id: "item-1",
      state: "Active",
      content: {
        title: "Work Login",
        content: {
          Login: {
            username: "alice",
            urls: [{ url: "https://example.com/login" }],
            totp_uri: "otpauth://totp/example",
          },
        },
      },
    },
    "Work",
    "vault-work",
  );

  assert.equal(item.shareId, "vault-work");
  assert.equal(item.itemId, "item-1");
  assert.equal(item.title, "Work Login");
  assert.equal(item.type, "login");
  assert.equal(item.vaultName, "Work");
  assert.deepEqual(item.urls, ["https://example.com/login"]);
  assert.equal(item.username, "alice");
  assert.equal(item.hasTotp, true);
});

test("keeps an explicit item share id when present", () => {
  const item = normalizeItem(
    {
      share_id: "vault-from-item",
      id: "item-2",
      content: {
        title: "Personal Note",
        content: {
          Note: {},
        },
      },
    },
    "Personal",
    "vault-from-context",
  );

  assert.equal(item.shareId, "vault-from-item");
  assert.equal(item.vaultName, "Personal");
  assert.equal(item.type, "note");
});
