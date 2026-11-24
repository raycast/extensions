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
    "createdAt",
    "email",
    "folderId",
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

test("recognizes note, credit card, alias and custom items", () => {
  const cases = [
    ["note", { Note: {} }],
    ["credit_card", { CreditCard: {} }],
    ["alias", { Alias: {} }],
    // pass-cli 2.5 prints notes and aliases with nothing in them.
    ["note", { Note: null }],
    ["alias", { Alias: null }],
    ["custom", { Custom: { sections: [] } }],
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

test("does not invent metadata omitted by pass-cli vault output", () => {
  assert.deepEqual(normalizeVault({ name: "Work", vault_id: "vault-id-2", share_id: "share-2" }), {
    shareId: "share-2",
    name: "Work",
    itemCount: undefined,
    role: undefined,
  });
});

/** An item as `pass-cli item view --output json` prints it (pass-cli 2.5.1), once unwrapped, with invented values. */
function viewed(content: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    id: "item-1",
    share_id: "vault-1",
    content: { title: "Example", note: "", item_uuid: "uuid", content, extra_fields: [], ...extra },
  };
}

test("reads a card's fields, with its expiration date as on the card", () => {
  const detail = normalizeItemDetail(
    viewed({
      CreditCard: {
        cardholder_name: "Jean Example",
        card_type: "Visa",
        number: "4242424242424242",
        verification_number: "123",
        expiration_date: "2027-12",
        pin: "",
      },
    }),
    "Personal",
  );
  assert.equal(detail.type, "credit_card");
  assert.deepEqual(detail.fields, {
    cardholderName: "Jean Example",
    cardNumber: "4242424242424242",
    expirationDate: "12/27",
    securityCode: "123",
  });
  assert.equal(detail.password, undefined);
});

test("reads an identity's fields, its address on one line, and its extra details by group", () => {
  const detail = normalizeItemDetail(
    viewed({
      Identity: {
        full_name: "Jean Example",
        email: "jean@example.com",
        phone_number: "",
        street_address: "12 Example Street",
        zip_or_postal_code: "75000",
        city: "Paris",
        country_or_region: "France",
        website: "https://example.com",
        passport_number: "X1234567",
        extra_personal_details: [{ name: "Nickname", content: { Text: "Jeannot" } }],
        extra_work_details: [{ name: "Badge", content: { Hidden: "4321" } }],
        extra_sections: [{ section_name: "Club", section_fields: [{ name: "Member ID", content: { Text: "42" } }] }],
      },
    }),
    "Personal",
  );
  assert.deepEqual(detail.fields, {
    fullName: "Jean Example",
    identityEmail: "jean@example.com",
    streetAddress: "12 Example Street",
    zipOrPostalCode: "75000",
    city: "Paris",
    countryOrRegion: "France",
    identityWebsite: "https://example.com",
    passportNumber: "X1234567",
    address: "12 Example Street, 75000 Paris, France",
  });
  // An identity's email is one of its fields: it isn't offered to fill logins.
  assert.equal(detail.email, undefined);
  assert.deepEqual(detail.customFields, [
    { name: "Nickname", value: "Jeannot", type: "text", section: "Personal Details" },
    { name: "Badge", value: "4321", type: "hidden", section: "Work Details" },
    { name: "Member ID", value: "42", type: "text", section: "Club" },
  ]);
});

test("reads an alias's address, which pass-cli prints beside its content", () => {
  const detail = normalizeItemDetail(
    { ...viewed({ Alias: null }), alias_email: "news.example@example.com" },
    "Personal",
  );
  assert.equal(detail.type, "alias");
  assert.deepEqual(detail.fields, { aliasAddress: "news.example@example.com" });
});

test("reads SSH keys and Wi-Fi networks, without taking a network's password for a login's", () => {
  const sshKey = normalizeItemDetail(
    viewed({
      SshKey: { private_key: "-----BEGIN OPENSSH PRIVATE KEY-----", public_key: "ssh-ed25519 AAAA", sections: [] },
    }),
    "Personal",
  );
  assert.deepEqual(sshKey.fields, { privateKey: "-----BEGIN OPENSSH PRIVATE KEY-----", publicKey: "ssh-ed25519 AAAA" });

  const wifi = normalizeItemDetail(
    viewed({
      Wifi: {
        ssid: "Example-Network",
        password: "network-secret",
        security: "WPA2",
        sections: [{ section_name: "Router", section_fields: [{ name: "Admin URL", content: { Text: "192.0.2.1" } }] }],
      },
    }),
    "Personal",
  );
  assert.deepEqual(wifi.fields, { ssid: "Example-Network", wifiPassword: "network-secret", security: "WPA2" });
  assert.equal(wifi.password, undefined);
  assert.deepEqual(wifi.customFields, [{ name: "Admin URL", value: "192.0.2.1", type: "text", section: "Router" }]);

  const unsecured = normalizeItemDetail(viewed({ Wifi: { ssid: "Open", security: "UnspecifiedWifiSecurity" } }));
  assert.deepEqual(unsecured.fields, { ssid: "Open" });
});

test("reads custom fields as pass-cli 2.5 prints them, before the fields of sections", () => {
  const detail = normalizeItemDetail(
    viewed(
      {
        Custom: {
          sections: [{ section_name: "Server", section_fields: [{ name: "Host", content: { Text: "example.com" } }] }],
        },
      },
      {
        extra_fields: [
          { name: "Region", content: { Text: "EU" } },
          { name: "API Key", content: { Hidden: "key-123" } },
          { name: "Backup Code", content: { Totp: "otpauth://totp/Example?secret=ABC" } },
          { name: "Renewal", content: { Timestamp: Date.UTC(2026, 5, 14) / 1000 } },
          { name: "Empty", content: { Text: "" } },
        ],
      },
    ),
    "Personal",
  );
  assert.equal(detail.type, "custom");
  assert.deepEqual(detail.customFields, [
    { name: "Region", value: "EU", type: "text" },
    { name: "API Key", value: "key-123", type: "hidden" },
    { name: "Backup Code", value: "otpauth://totp/Example?secret=ABC", type: "totp" },
    { name: "Renewal", value: "Jun 14, 2026", type: "date" },
    { name: "Host", value: "example.com", type: "text", section: "Server" },
  ]);
  assert.equal(detail.fields, undefined);
});

test("still reads custom fields printed as name, value and type", () => {
  const detail = normalizeItemDetail(
    viewed({ Login: { username: "alice" } }, { extra_fields: [{ name: "PIN", value: "1234", type: "hidden" }] }),
  );
  assert.deepEqual(detail.customFields, [{ name: "PIN", value: "1234", type: "hidden" }]);
});

test("listed items keep what tells them apart, never a secret, which would be cached", () => {
  const card = normalizeItem(
    viewed({ CreditCard: { number: "4242 4242 4242 1234", verification_number: "123", pin: "0000" } }),
    "Personal",
  );
  assert.equal(card.summary, "•••• 1234");
  assert.equal(JSON.stringify(card).includes("4242"), false);
  assert.equal(Object.hasOwn(card, "fields"), false);
  assert.equal(normalizeItem(viewed({ CreditCard: { number: "" } }), "Personal").summary, undefined);

  const alias = normalizeItem({ ...viewed({ Alias: null }), alias_email: "news@example.com" }, "Personal");
  assert.equal(alias.summary, "news@example.com");
  const wifi = normalizeItem(viewed({ Wifi: { ssid: "Example-Network", password: "network-secret" } }), "Personal");
  assert.equal(wifi.summary, "Example-Network");
  assert.equal(JSON.stringify(wifi).includes("network-secret"), false);
  const identity = normalizeItem(viewed({ Identity: { full_name: "Jean Example", email: "jean@example.com" } }));
  assert.equal(identity.summary, "Jean Example");
  const unnamed = normalizeItem(viewed({ Identity: { full_name: "", email: "jean@example.com" } }));
  assert.equal(unnamed.summary, "jean@example.com");
  for (const content of [
    { Note: null },
    { SshKey: { public_key: "ssh-ed25519 AAAA" } },
    { Custom: { sections: [] } },
  ]) {
    assert.equal(Object.hasOwn(normalizeItem(viewed(content)), "summary"), false);
  }
});

test("keeps secrets exactly as saved, spaces at their ends included, and trims what's only shown", () => {
  const login = normalizeItemDetail(
    viewed(
      { Login: { username: " alice ", password: " pass phrase " } },
      {
        extra_fields: [
          { name: "Region", content: { Text: " EU " } },
          { name: "API Key", content: { Hidden: " key-123 " } },
          { name: "Backup Code", content: { Totp: " otpauth://totp/Example?secret=ABC " } },
        ],
      },
    ),
    "Personal",
  );
  assert.equal(login.password, " pass phrase ");
  assert.equal(login.username, "alice");
  assert.deepEqual(
    login.customFields?.map((field) => field.value),
    ["EU", " key-123 ", " otpauth://totp/Example?secret=ABC "],
  );
  // A password of spaces only is still a password.
  assert.equal(normalizeItem(viewed({ Login: { password: "   " } }), "Personal").hasPassword, true);
  assert.equal(normalizeItem(viewed({ Login: { password: "" } }), "Personal").hasPassword, false);

  const wifi = normalizeItemDetail(viewed({ Wifi: { ssid: " Example-Network ", password: " network secret " } }));
  assert.deepEqual(wifi.fields, { ssid: "Example-Network", wifiPassword: " network secret " });

  const card = normalizeItemDetail(
    viewed({
      CreditCard: {
        cardholder_name: " Jean Example ",
        number: " 4242 4242 4242 4242 ",
        verification_number: " 123",
        pin: "0000 ",
      },
    }),
  );
  assert.deepEqual(card.fields, {
    cardholderName: "Jean Example",
    cardNumber: " 4242 4242 4242 4242 ",
    securityCode: " 123",
    pin: "0000 ",
  });

  const privateKey = "-----BEGIN OPENSSH PRIVATE KEY-----\nexample\n-----END OPENSSH PRIVATE KEY-----\n";
  const sshKey = normalizeItemDetail(viewed({ SshKey: { private_key: privateKey, public_key: " ssh-ed25519 AAAA " } }));
  assert.deepEqual(sshKey.fields, { privateKey, publicKey: "ssh-ed25519 AAAA" });

  const identity = normalizeItemDetail(viewed({ Identity: { full_name: " Jean ", passport_number: " X123 " } }));
  assert.deepEqual(identity.fields, { fullName: "Jean", passportNumber: " X123 " });

  const older = normalizeItemDetail(
    viewed(
      { Login: {} },
      {
        extra_fields: [
          { name: "PIN", value: " 1234 ", type: "hidden" },
          { name: "Region", value: " EU ", type: "text" },
        ],
      },
    ),
  );
  assert.deepEqual(
    older.customFields?.map((field) => field.value),
    [" 1234 ", "EU"],
  );
});
