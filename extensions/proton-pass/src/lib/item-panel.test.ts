import test from "node:test";
import assert from "node:assert/strict";
import { getPanelRows, PanelRows } from "./item-panel";
import { Item, ItemDetail } from "./types";

const login: Item = {
  shareId: "vault-1",
  itemId: "item-1",
  title: "Example",
  type: "login",
  vaultName: "Personal",
  username: "alice",
  email: "alice@example.com",
  urls: ["https://example.com", "example.com/login"],
  hasTotp: true,
  hasPassword: true,
  hasNote: true,
  modifiedAt: "2026-06-14T12:00:00Z",
};

const note: Item = {
  shareId: "vault-1",
  itemId: "item-2",
  title: "Wi-Fi",
  type: "note",
  vaultName: "Personal",
  hasTotp: false,
  hasNote: true,
};

const bareLogin: Item = {
  shareId: "vault-2",
  itemId: "item-3",
  title: "Bare",
  type: "login",
  vaultName: "Work",
  hasTotp: false,
  hasPassword: false,
  hasNote: false,
};

const NOW = Date.parse("2026-06-15T12:00:00Z");

function layout(rows: PanelRows) {
  return [...rows.fields, ...rows.metadata].map((row) => `${row.id}:${row.title}`);
}

function valueOf(rows: PanelRows, id: string) {
  return [...rows.fields, ...rows.metadata, ...rows.customFields].find((row) => row.id === id)?.value;
}

test("shows the same rows in the same order for every item", () => {
  const expected = [
    "username:Username",
    "email:Email",
    "password:Password",
    "totp:2FA Code",
    "website:Website",
    "note:Note",
    "vault:Vault",
    "type:Type",
    "modified:Last Modified",
  ];
  assert.deepEqual(layout(getPanelRows({ item: login, isLoading: false, now: NOW })), expected);
  assert.deepEqual(layout(getPanelRows({ item: note, isLoading: true })), expected);
  assert.deepEqual(layout(getPanelRows({ item: bareLogin, isLoading: false, error: "boom" })), expected);
});

test("marks missing values as empty and keeps secrets masked", () => {
  const rows = getPanelRows({ item: bareLogin, isLoading: false });
  for (const id of ["username", "email", "password", "totp", "website", "note", "modified"]) {
    assert.deepEqual(valueOf(rows, id), { kind: "empty" }, id);
  }

  const loginRows = getPanelRows({ item: login, isLoading: false, now: NOW });
  assert.deepEqual(valueOf(loginRows, "username"), { kind: "text", text: "alice" });
  assert.deepEqual(valueOf(loginRows, "password"), { kind: "masked" });
  assert.deepEqual(valueOf(loginRows, "note"), { kind: "masked" });
  assert.deepEqual(valueOf(loginRows, "modified"), { kind: "text", text: "yesterday" });
});

test("shows loading and unavailable states for values that need the item details", () => {
  const cachedLogin: Item = { ...login, hasPassword: undefined, hasNote: undefined };
  const loading = getPanelRows({ item: cachedLogin, isLoading: true });
  assert.deepEqual(valueOf(loading, "password"), { kind: "loading" });
  assert.deepEqual(valueOf(loading, "note"), { kind: "loading" });
  assert.deepEqual(valueOf(loading, "totp"), { kind: "loading" });

  const failed = getPanelRows({ item: cachedLogin, isLoading: false, error: "boom" });
  assert.deepEqual(valueOf(failed, "password"), { kind: "unavailable" });
  assert.deepEqual(valueOf(failed, "totp"), { kind: "unavailable" });

  const failedCode = getPanelRows({ item: login, detail: { ...login }, totpFailed: true, isLoading: false });
  assert.deepEqual(valueOf(failedCode, "totp"), { kind: "unavailable" });
});

test("prefers loaded details and lists websites and custom fields", () => {
  const detail: ItemDetail = {
    ...login,
    username: "alice.work",
    password: "secret",
    note: undefined,
    customFields: [
      { name: "PIN", value: "1234", type: "hidden" },
      { name: "Region", value: "EU", type: "text" },
    ],
  };
  const rows = getPanelRows({ item: login, detail, totp: { code: "123456", remainingSeconds: 12 }, isLoading: false });

  assert.deepEqual(valueOf(rows, "username"), { kind: "text", text: "alice.work" });
  for (const removed of [undefined, ""]) {
    const removedRows = getPanelRows({
      item: login,
      detail: { ...detail, username: removed, email: removed },
      isLoading: false,
    });
    assert.deepEqual(valueOf(removedRows, "username"), { kind: "empty" });
    assert.deepEqual(valueOf(removedRows, "email"), { kind: "empty" });
  }
  assert.deepEqual(valueOf(rows, "note"), { kind: "empty" });
  assert.deepEqual(valueOf(rows, "totp"), { kind: "code", code: "123456", remainingSeconds: 12 });
  assert.deepEqual(valueOf(rows, "website"), {
    kind: "websites",
    websites: [
      { label: "example.com", url: "https://example.com" },
      { label: "example.com/login", url: "https://example.com/login" },
    ],
  });
  assert.deepEqual(
    rows.customFields.map((row) => [row.title, row.value]),
    [
      ["PIN", { kind: "masked" }],
      ["Region", { kind: "text", text: "EU" }],
    ],
  );
});
