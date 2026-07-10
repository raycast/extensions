import assert from "node:assert/strict";
import test from "node:test";

import {
  contactFromPersistedEntry,
  contactMapToPersisted,
  contactPhotoCacheToPersisted,
  emptyPersistedContactMap,
  mergeContactMapIntoPersisted,
  mergeContactPhotoCacheIntoPersisted,
  mergeOpenChatCacheIntoPersisted,
  mergePersistedContactMaps,
  parsePersistedContactMap,
  persistedToContactMap,
  persistedToContactPhotoCache,
} from "../src/contact-map-persist.ts";
import { createContactMap, type Contact } from "../src/contact-map-persist.ts";

function sampleContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    givenName: "Ada",
    familyName: "Lovelace",
    displayName: "Ada Lovelace",
    phoneNumbers: [{ number: "+15551234567", countryCode: "US" }],
    emailAddresses: ["ada@example.com"],
    matchedChatIdentifiers: ["+15551234567", "ada@example.com"],
    imageData: "base64-photo-data",
    ...overrides,
  };
}

test("contactMapToPersisted stores names in byIdentifier only", () => {
  const contactMap = createContactMap([sampleContact()]);
  const persisted = contactMapToPersisted(contactMap);

  assert.equal(persisted.version, 2);
  assert.equal(persisted.byIdentifier["+15551234567"]?.displayName, "Ada Lovelace");
  assert.equal(persisted.byIdentifier["ada@example.com"]?.contactId, "contact-1");
  assert.equal(JSON.stringify(persisted.byIdentifier).includes("base64-photo-data"), false);
});

test("contactPhotoCacheToPersisted stores photos once per contactId", () => {
  const persisted = contactPhotoCacheToPersisted(
    new Map([
      ["contact-1", "base64-photo-data"],
      ["contact-2", null],
    ]),
  );

  assert.deepEqual(persisted, {
    "contact-1": { imageData: "base64-photo-data" },
  });
});

test("persisted round-trip rebuilds lookup map and photos", () => {
  const original = createContactMap([sampleContact()]);
  const persisted = mergeOpenChatCacheIntoPersisted(
    emptyPersistedContactMap(),
    original,
    new Map([["contact-1", "base64-photo-data"]]),
  );
  const restored = persistedToContactMap(persisted);
  const restoredPhotos = persistedToContactPhotoCache(persisted);

  assert.equal(restored.get("+15551234567")?.displayName, "Ada Lovelace");
  assert.equal(restored.get("+15551234567")?.imageData, "base64-photo-data");
  assert.equal(restoredPhotos.get("contact-1"), "base64-photo-data");
});

test("mergePersistedContactMaps keeps incoming entries", () => {
  const base = emptyPersistedContactMap();
  base.byIdentifier["+15550000001"] = { contactId: "a", displayName: "Alpha" };

  const incoming = emptyPersistedContactMap();
  incoming.byIdentifier["+15550000002"] = { contactId: "b", displayName: "Beta" };
  incoming.byIdentifier["+15550000001"] = { contactId: "a", displayName: "Alpha Updated" };

  const merged = mergePersistedContactMaps(base, incoming);
  assert.equal(merged.byIdentifier["+15550000001"]?.displayName, "Alpha Updated");
  assert.equal(merged.byIdentifier["+15550000002"]?.displayName, "Beta");
});

test("mergeContactMapIntoPersisted merges live contacts into stored map", () => {
  const stored = emptyPersistedContactMap();
  stored.byIdentifier["+15550000001"] = { contactId: "a", displayName: "Alpha" };

  const liveMap = createContactMap([
    sampleContact({
      id: "contact-2",
      displayName: "Grace Hopper",
      matchedChatIdentifiers: ["+15550000003"],
      phoneNumbers: [{ number: "+15550000003", countryCode: "US" }],
      emailAddresses: [],
      imageData: null,
    }),
  ]);

  const merged = mergeContactMapIntoPersisted(stored, liveMap);
  assert.equal(merged.byIdentifier["+15550000001"]?.displayName, "Alpha");
  assert.equal(merged.byIdentifier["+15550000003"]?.displayName, "Grace Hopper");
});

test("mergeContactPhotoCacheIntoPersisted keeps existing photos", () => {
  const stored = emptyPersistedContactMap();
  stored.byContactId["contact-a"] = { imageData: "photo-a" };

  const merged = mergeContactPhotoCacheIntoPersisted(
    stored,
    new Map([
      ["contact-a", "photo-a-updated"],
      ["contact-b", "photo-b"],
    ]),
  );

  assert.equal(merged.byContactId["contact-a"]?.imageData, "photo-a-updated");
  assert.equal(merged.byContactId["contact-b"]?.imageData, "photo-b");
});

test("parsePersistedContactMap accepts v1 and upgrades to v2", () => {
  const v1 = parsePersistedContactMap(
    JSON.stringify({
      version: 1,
      updatedAtEpochMs: 1,
      byIdentifier: { "+15550000001": { contactId: "a", displayName: "Alpha" } },
    }),
  );

  assert.equal(v1?.version, 2);
  assert.deepEqual(v1?.byContactId, {});
  assert.equal(v1?.byIdentifier["+15550000001"]?.displayName, "Alpha");
});

test("parsePersistedContactMap rejects invalid payloads", () => {
  assert.equal(parsePersistedContactMap(undefined), undefined);
  assert.equal(parsePersistedContactMap("{"), undefined);
  assert.equal(parsePersistedContactMap(JSON.stringify({ version: 3, byIdentifier: {} })), undefined);
});

test("contactFromPersistedEntry maps email identifiers", () => {
  const contact = contactFromPersistedEntry("user@example.com", {
    contactId: "contact-email",
    displayName: "Email User",
  });

  assert.deepEqual(contact.emailAddresses, ["user@example.com"]);
  assert.equal(contact.displayName, "Email User");
});
