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
  return [...rows.main, ...rows.details].map((row) => `${row.id}:${row.title}`);
}

function valueOf(rows: PanelRows, id: string) {
  return [...rows.main, ...rows.details, ...rows.customFields].find((row) => row.id === id)?.value;
}

test("shows the same rows in the same order for every login", () => {
  const expected = [
    "username:Username",
    "email:Email",
    "password:Password",
    "totp:TOTP Code",
    "website:Website",
    "note:Note",
    "vault:Vault",
    "folder:Folder",
    "type:Type",
    "modified:Last Modified",
  ];
  assert.deepEqual(layout(getPanelRows({ item: login, isLoading: false, now: NOW })), expected);
  assert.deepEqual(layout(getPanelRows({ item: { ...login, hasPassword: undefined }, isLoading: true })), expected);
  assert.deepEqual(layout(getPanelRows({ item: bareLogin, isLoading: false, error: "boom" })), expected);
});

test("a note shows its note first, without a login's rows", () => {
  const rows = getPanelRows({ item: note, isLoading: false, now: NOW });
  assert.deepEqual(layout(rows), ["note:Note", "vault:Vault", "folder:Folder", "type:Type", "modified:Last Modified"]);
  assert.deepEqual(valueOf(rows, "note"), { kind: "masked" });
});

test("the Folder row shows the item's folder with the ones it's in", () => {
  const item = {
    ...login,
    folderId: "cards",
    folderPath: [
      { id: "banking", name: "Banking" },
      { id: "cards", name: "Cards" },
    ],
  };
  assert.deepEqual(valueOf(getPanelRows({ item, isLoading: false }), "folder"), {
    kind: "text",
    text: "Banking › Cards",
  });
});

test("groups the credentials apart from the details about the item", () => {
  const rows = getPanelRows({ item: login, isLoading: false, now: NOW });
  assert.deepEqual(
    rows.main.map((row) => row.id),
    ["username", "email", "password", "totp"],
  );
  assert.deepEqual(
    rows.details.map((row) => row.id),
    ["website", "note", "vault", "folder", "type", "modified"],
  );
});

test("marks missing values as empty and keeps secrets masked", () => {
  const rows = getPanelRows({ item: bareLogin, isLoading: false });
  for (const id of ["username", "email", "password", "totp", "website", "note", "folder", "modified"]) {
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

function itemOf(type: Item["type"], title: string): Item {
  return { shareId: "vault-1", itemId: `item-${type}`, title, type, vaultName: "Personal", hasTotp: false };
}

const DETAILS = ["note:Note", "vault:Vault", "folder:Folder", "type:Type", "modified:Last Modified"];

test("each type shows its own fields first, the same ones for every item of the type", () => {
  const layouts: [Item["type"], string[]][] = [
    [
      "credit_card",
      [
        "cardholderName:Cardholder Name",
        "cardNumber:Card Number",
        "expirationDate:Expiration Date",
        "securityCode:Security Code",
        "pin:PIN",
      ],
    ],
    ["identity", ["fullName:Full Name", "identityEmail:Email", "phoneNumber:Phone Number", "address:Address"]],
    ["alias", ["aliasAddress:Alias Address"]],
    ["ssh_key", ["publicKey:Public Key", "privateKey:Private Key"]],
    ["wifi", ["ssid:Network Name", "wifiPassword:Password", "security:Security"]],
    ["custom", []],
  ];
  for (const [type, fields] of layouts) {
    const item = itemOf(type, type);
    // Loading, then loaded without any field filled: the rows stay the same.
    for (const rows of [
      getPanelRows({ item, isLoading: true }),
      getPanelRows({ item, detail: { ...item }, isLoading: false }),
    ]) {
      assert.deepEqual(layout(rows), [...fields, ...DETAILS], type);
    }
  }
});

test("a card's secrets are masked, and its number shows its last digits only", () => {
  const card = itemOf("credit_card", "Visa");
  const detail: ItemDetail = {
    ...card,
    fields: {
      cardholderName: "Jean Example",
      cardNumber: "4242 4242 4242 4242",
      expirationDate: "12/27",
      securityCode: "123",
      pin: "0000",
    },
  };
  const rows = getPanelRows({ item: card, detail, isLoading: false });
  assert.deepEqual(valueOf(rows, "cardholderName"), { kind: "text", text: "Jean Example" });
  assert.deepEqual(valueOf(rows, "cardNumber"), { kind: "masked", lastDigits: "4242" });
  assert.deepEqual(valueOf(rows, "expirationDate"), { kind: "text", text: "12/27" });
  assert.deepEqual(valueOf(rows, "securityCode"), { kind: "masked" });
  assert.deepEqual(valueOf(rows, "pin"), { kind: "masked" });

  const loading = getPanelRows({ item: card, isLoading: true });
  assert.deepEqual(valueOf(loading, "cardNumber"), { kind: "loading" });
  const failed = getPanelRows({ item: card, isLoading: false, error: "boom" });
  assert.deepEqual(valueOf(failed, "cardNumber"), { kind: "unavailable" });
  const empty = getPanelRows({ item: card, detail: { ...card }, isLoading: false });
  assert.deepEqual(valueOf(empty, "cardNumber"), { kind: "empty" });
});

test("an identity shows its other fields when filled, with government numbers masked, and no address parts", () => {
  const identity = itemOf("identity", "Me");
  const detail: ItemDetail = {
    ...identity,
    fields: {
      fullName: "Jean Example",
      address: "12 Example Street, 75000 Paris, France",
      streetAddress: "12 Example Street",
      city: "Paris",
      company: "Example Inc.",
      passportNumber: "X1234567",
    },
  };
  const rows = getPanelRows({ item: identity, detail, isLoading: false });
  assert.deepEqual(
    rows.main.map((row) => row.id),
    ["fullName", "identityEmail", "phoneNumber", "address", "passportNumber", "company"],
  );
  assert.deepEqual(valueOf(rows, "identityEmail"), { kind: "empty" });
  assert.deepEqual(valueOf(rows, "address"), { kind: "text", text: "12 Example Street, 75000 Paris, France" });
  assert.deepEqual(valueOf(rows, "passportNumber"), { kind: "masked" });
});

test("aliases, SSH keys and Wi-Fi networks show their fields, with their secrets masked", () => {
  const alias = itemOf("alias", "Newsletter");
  const aliasRows = getPanelRows({
    item: alias,
    detail: { ...alias, fields: { aliasAddress: "news.example@example.com" } },
    isLoading: false,
  });
  assert.deepEqual(valueOf(aliasRows, "aliasAddress"), { kind: "text", text: "news.example@example.com" });

  const sshKey = itemOf("ssh_key", "Server");
  const sshRows = getPanelRows({
    item: sshKey,
    detail: { ...sshKey, fields: { publicKey: "ssh-ed25519 AAAA example", privateKey: "-----BEGIN-----" } },
    isLoading: false,
  });
  assert.deepEqual(valueOf(sshRows, "publicKey"), { kind: "text", text: "ssh-ed25519 AAAA example" });
  assert.deepEqual(valueOf(sshRows, "privateKey"), { kind: "masked" });

  const wifi = itemOf("wifi", "Home");
  const wifiRows = getPanelRows({
    item: wifi,
    detail: { ...wifi, fields: { ssid: "Example-Network", wifiPassword: "secret" } },
    isLoading: false,
  });
  assert.deepEqual(valueOf(wifiRows, "ssid"), { kind: "text", text: "Example-Network" });
  assert.deepEqual(valueOf(wifiRows, "wifiPassword"), { kind: "masked" });
  assert.deepEqual(valueOf(wifiRows, "security"), { kind: "empty" });
});

test("custom fields keep their section, and TOTP fields are masked while dates are shown", () => {
  const custom = itemOf("custom", "Server");
  const detail: ItemDetail = {
    ...custom,
    customFields: [
      { name: "Region", value: "EU", type: "text" },
      { name: "Host", value: "example.com", type: "text", section: "Server" },
      { name: "Root Code", value: "otpauth://totp/Example?secret=ABC", type: "totp", section: "Server" },
      { name: "Renewal", value: "Jun 14, 2026", type: "date", section: "Contract" },
    ],
  };
  const rows = getPanelRows({ item: custom, detail, isLoading: false });
  assert.deepEqual(
    rows.customFields.map((row) => [row.title, row.section, row.value]),
    [
      ["Region", undefined, { kind: "text", text: "EU" }],
      ["Host", "Server", { kind: "text", text: "example.com" }],
      ["Root Code", "Server", { kind: "masked" }],
      ["Renewal", "Contract", { kind: "text", text: "Jun 14, 2026" }],
    ],
  );
});
