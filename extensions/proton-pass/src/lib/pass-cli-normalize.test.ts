import test from "node:test";
import assert from "node:assert/strict";
import { normalizeItem, normalizeItemDetail, normalizeVault } from "./pass-cli-normalize";
import { PassCliError } from "./types";

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

test("normalizes full login data to exactly the cache-safe Item keys", () => {
  const item = normalizeItem(
    {
      id: "item-secret",
      password: "outer-secret",
      totp_uri: "otpauth://totp/outer-secret",
      content: {
        title: "Secret Login",
        content: {
          Login: {
            username: "alice",
            email: "alice@example.com",
            password: "inner-secret",
            urls: [{ url: "https://example.com" }],
            totp_uri: "otpauth://totp/inner-secret",
          },
        },
      },
    },
    "Personal",
    "vault-1",
  );

  assert.deepEqual(Object.keys(item).sort(), [
    "email",
    "hasNote",
    "hasPassword",
    "hasTotp",
    "itemId",
    "modifiedAt",
    "shareId",
    "title",
    "type",
    "urls",
    "username",
    "vaultName",
  ]);
  assert.equal(Object.hasOwn(item, "password"), false);
  assert.equal(Object.hasOwn(item, "totp_uri"), false);
  assert.equal(Object.hasOwn(item, "totpUri"), false);
  assert.equal(item.hasTotp, true);
  assert.equal(item.hasPassword, true);
});

test("records whether a login has a password and when it was last modified", () => {
  const login = normalizeItem(
    {
      id: "item-1",
      modify_time: "2025-06-01T12:34:56",
      content: { title: "Passkey Only", content: { Login: { username: "alice", password: "" } } },
    },
    "Personal",
    "vault-1",
  );
  assert.equal(login.hasPassword, false);
  assert.equal(login.modifiedAt, "2025-06-01T12:34:56.000Z");

  const note = normalizeItem(
    { id: "item-2", modify_time: 1748781296, content: { title: "Note", content: { Note: {} } } },
    "Personal",
    "vault-1",
  );
  assert.equal(note.hasPassword, undefined);
  assert.equal(note.modifiedAt, "2025-06-01T12:34:56.000Z");

  const undated = normalizeItem(
    { id: "item-3", modify_time: "not a date", content: { title: "Note", content: { Note: {} } } },
    "Personal",
    "vault-1",
  );
  assert.equal(undated.modifiedAt, undefined);
});

test("records whether an item has a note without keeping the note", () => {
  const withNote = normalizeItem(
    {
      id: "item-1",
      content: { title: "Login", note: "  recovery codes  ", content: { Login: { username: "alice" } } },
    },
    "Personal",
    "vault-1",
  );
  assert.equal(withNote.hasNote, true);
  assert.equal(JSON.stringify(withNote).includes("recovery codes"), false);

  const withoutNote = normalizeItem(
    { id: "item-2", content: { title: "Login", note: "   ", content: { Login: { username: "alice" } } } },
    "Personal",
    "vault-1",
  );
  assert.equal(withoutNote.hasNote, false);
});

test("exposes the TOTP URI in item details only", () => {
  const raw = {
    id: "item-1",
    content: {
      title: "Login",
      content: { Login: { username: "alice", password: "secret", totp_uri: "otpauth://totp/Example?secret=ABC" } },
    },
  };
  const detail = normalizeItemDetail(raw, "Personal", "vault-1");
  assert.equal(detail.totpUri, "otpauth://totp/Example?secret=ABC");
  assert.equal(detail.password, "secret");
  assert.equal(detail.vaultName, "Personal");
});

test("recognizes note, credit card, and alias items", () => {
  const cases = [
    ["note", { Note: {} }],
    ["credit_card", { CreditCard: {} }],
    ["alias", { Alias: {} }],
  ] as const;

  for (const [expectedType, content] of cases) {
    const item = normalizeItem(
      { id: `item-${expectedType}`, content: { title: expectedType, content } },
      "Personal",
      "vault-1",
    );
    assert.equal(item.type, expectedType);
  }
});

test("accepts alternate credit-card and SSH-key field names", () => {
  const creditCard = normalizeItem(
    { id: "card", content: { title: "Card", content: { credit_card: {} } } },
    "Personal",
    "vault-1",
  );
  const sshKey = normalizeItem(
    { id: "ssh", content: { title: "SSH", content: { ssh_key: {} } } },
    "Personal",
    "vault-1",
  );

  assert.equal(creditCard.type, "credit_card");
  assert.equal(sshKey.type, "ssh_key");
});

test("rejects malformed item and vault records as invalid output", () => {
  for (const normalize of [() => normalizeItem({ title: "Missing IDs" }), () => normalizeVault("bad")]) {
    assert.throws(normalize, (error: unknown) => {
      assert.equal(error instanceof PassCliError && error.type, "invalid_output");
      return true;
    });
  }
});

test("does not invent metadata omitted by pass-cli 2.3.3 vault output", () => {
  assert.deepEqual(normalizeVault({ name: "Work", vault_id: "vault-id-2", share_id: "share-2" }), {
    shareId: "share-2",
    name: "Work",
    itemCount: undefined,
    role: undefined,
  });
});
