const assert = require("node:assert/strict");
const { before, test } = require("node:test");
const openpgp = require("openpgp");
const loadTypeScript = require("./load-typescript.cjs");
const { MetadataDecryptor } = loadTypeScript("src/lib/metadata.ts");
const { filterResources } = loadTypeScript("src/utils/resources.ts");

const baseUrl = "https://vault.example.test";
const userId = "test-user";
const keyId = "metadata-key";
const typeId = "v5-default-type";
let userKey, otherUserKey, sharedKey, protectedSharedKey, encryptedMetadata, personalMetadata;

async function encrypt(value, recipient, signer) {
  return openpgp.encrypt({
    message: await openpgp.createMessage({ text: typeof value === "string" ? value : JSON.stringify(value) }),
    encryptionKeys: recipient.toPublic(),
    ...(signer ? { signingKeys: signer } : {}),
  });
}

function metadata(overrides = {}) {
  return {
    object_type: "PASSBOLT_RESOURCE_METADATA",
    resource_type_id: typeId,
    name: "Example Login",
    username: "alice@example.test",
    uris: ["https://primary.example.test", "https://secondary.example.test"],
    description: "Searchable notes",
    ...overrides,
  };
}

function resource(overrides = {}) {
  return {
    id: "resource-1",
    resource_type_id: typeId,
    created: "2026-01-01",
    modified: "2026-01-02",
    deleted: false,
    favorite: true,
    tags: [{ id: "tag-1", slug: "work", is_shared: true }],
    metadata_key_type: "shared_key",
    metadata_key_id: keyId,
    metadata: encryptedMetadata,
    ...overrides,
  };
}

async function sharedKeyResponse(overrides = {}, signer = userKey) {
  const payload = {
    object_type: "PASSBOLT_METADATA_PRIVATE_KEY",
    domain: baseUrl,
    fingerprint: sharedKey.getFingerprint(),
    armored_key: protectedSharedKey,
    passphrase: "test-passphrase",
    ...overrides,
  };
  return {
    userId,
    keys: [
      {
        id: keyId,
        fingerprint: sharedKey.getFingerprint(),
        metadata_private_keys: [
          { user_id: null, metadata_key_id: keyId, data: "server copy must never be used" },
          { user_id: "other-user", metadata_key_id: keyId, data: "another user's copy must never be used" },
          { user_id: userId, metadata_key_id: keyId, data: await encrypt(payload, userKey, signer) },
        ],
      },
    ],
  };
}

function decryptor(loadKeys = () => sharedKeyResponse(), loadUser = async () => userKey) {
  return new MetadataDecryptor(baseUrl, loadUser, loadKeys);
}

before(async () => {
  async function generate(name) {
    const pair = await openpgp.generateKey({ type: "ecc", curve: "curve25519", userIDs: [{ name }], format: "object" });
    return pair.privateKey;
  }
  [userKey, otherUserKey, sharedKey] = await Promise.all([
    generate("User"),
    generate("Other user"),
    generate("Metadata"),
  ]);
  protectedSharedKey = (await openpgp.encryptKey({ privateKey: sharedKey, passphrase: "test-passphrase" })).armor();
  encryptedMetadata = await encrypt(metadata(), sharedKey, sharedKey);
  personalMetadata = await encrypt(metadata({ name: "Personal Login" }), userKey, userKey);
});

test("legacy resources remain searchable without loading any metadata keys", async () => {
  const fail = async () => {
    throw new Error("Legacy resources should not load keys");
  };
  const legacy = resource({ metadata: undefined, metadata_key_type: undefined, name: "Legacy Login", username: null });
  const [result] = await decryptor(fail, fail).decryptResources([legacy]);
  assert.equal(result.name, "Legacy Login");
  assert.equal(result.username, "");
  assert.equal(result.uri, "");
  assert.equal(filterResources([result], "LEGACY").length, 1);
});

test("personal v5 metadata is decrypted with the user key without fetching shared keys", async () => {
  const [result] = await decryptor(async () => {
    throw new Error("No shared-key request expected");
  }).decryptResources([resource({ metadata_key_type: "user_key", metadata_key_id: null, metadata: personalMetadata })]);
  assert.equal(result.name, "Personal Login");
  assert.equal(result.username, "alice@example.test");
  assert.equal(result.metadata_error, undefined);
});

test("shared metadata selects this user's envelope, verifies it, and unwraps the protected private key", async () => {
  const original = resource();
  const [result] = await decryptor().decryptResources([original]);
  assert.equal(result.metadata_error, undefined);
  assert.equal(result.name, "Example Login");
  assert.equal(result.username, "alice@example.test");
  assert.equal(result.uri, "https://primary.example.test");
  assert.equal(result.description, "Searchable notes");
  assert.deepEqual(result.uris, metadata().uris);
  assert.equal(result.favorite, true);
  assert.deepEqual(result.tags, original.tags);
  assert.equal(original.name, undefined, "input resource is not mutated");
  for (const term of ["EXAMPLE LOGIN", "ALICE", "PRIMARY", "SECONDARY", "SEARCHABLE"]) {
    assert.equal(filterResources([result], term).length, 1, term);
  }
  assert.equal(filterResources([result], "missing").length, 0);
});

test("mixed vaults preserve order and reuse user and shared keys across concurrent batches", async () => {
  let keyLoads = 0,
    userLoads = 0;
  const decoder = decryptor(
    async () => {
      keyLoads++;
      return sharedKeyResponse();
    },
    async () => {
      userLoads++;
      return userKey;
    },
  );
  const entries = Array.from({ length: 23 }, (_, i) => resource({ id: `shared-${i}` }));
  entries.splice(1, 0, resource({ id: "personal", metadata_key_type: "user_key", metadata: personalMetadata }));
  entries.splice(2, 0, resource({ id: "legacy", metadata: undefined, metadata_key_type: undefined, name: "Legacy" }));
  const results = await decoder.decryptResources(entries);
  assert.deepEqual(
    results.map((r) => r.id),
    entries.map((r) => r.id),
  );
  assert.ok(results.every((r) => !r.metadata_error));
  assert.equal(keyLoads, 1);
  assert.equal(userLoads, 1);
});

test("nullable v5 fields and absent legacy names do not break search", async () => {
  const encrypted = await encrypt(metadata({ username: null, description: null, uris: null }), userKey);
  const results = await decryptor().decryptResources([
    resource({ metadata_key_type: "user_key", metadata: encrypted }),
    resource({ metadata_key_type: undefined, metadata: undefined, name: null }),
  ]);
  assert.equal(results[0].username, "");
  assert.equal(results[0].uri, "");
  assert.equal(results[0].description, "");
  assert.equal(filterResources(results, "example").length, 1);
  assert.equal(filterResources(results, "absent").length, 0);
});

test("an unreadable entry is reported without preventing readable entries from loading", async () => {
  const results = await decryptor().decryptResources([
    resource({ metadata: "not an OpenPGP message" }),
    resource({ metadata_key_type: "user_key", metadata: personalMetadata }),
  ]);
  assert.equal(results[0].name, "Unable to decrypt resource");
  assert.ok(results[0].metadata_error);
  assert.equal(results[1].name, "Personal Login");
  assert.equal(results[1].metadata_error, undefined);
});

test("missing shares and key-loading failures are visible instead of being treated as an empty vault", async () => {
  for (const loadKeys of [
    async () => ({ userId, keys: [] }),
    async () => {
      throw new Error("private diagnostic");
    },
  ]) {
    const results = await decryptor(loadKeys).decryptResources([resource()]);
    assert.equal(results.length, 1);
    assert.ok(results[0].metadata_error);
    assert.ok(!results[0].metadata_error.includes("private diagnostic"));
  }
});

test("unsigned and foreign-signed shared-key envelopes are rejected", async () => {
  for (const signer of [null, otherUserKey]) {
    const [result] = await decryptor(() => sharedKeyResponse({}, signer)).decryptResources([resource()]);
    assert.match(result.metadata_error, /verify.*metadata key/);
  }
});

test("shared keys from another instance or with mismatched fingerprints are rejected", async () => {
  for (const overrides of [{ domain: "https://other.example.test" }, { fingerprint: userKey.getFingerprint() }]) {
    const [result] = await decryptor(() => sharedKeyResponse(overrides)).decryptResources([resource()]);
    assert.ok(result.metadata_error);
    assert.notEqual(result.name, "Example Login");
  }
});

test("malformed metadata, wrong object types, and resource type mismatches produce safe errors", async () => {
  for (const payload of [
    "sensitive-test-data",
    [],
    metadata({ name: null }),
    metadata({ object_type: "PASSBOLT_SECRET_DATA" }),
    metadata({ resource_type_id: "wrong" }),
    metadata({ uris: [42] }),
  ]) {
    const encrypted = await encrypt(payload, userKey);
    const [result] = await decryptor().decryptResources([
      resource({ metadata_key_type: "user_key", metadata: encrypted }),
    ]);
    assert.ok(result.metadata_error);
    assert.ok(!result.metadata_error.includes("sensitive-test-data"));
  }
});

test("the API client decrypts before filtering and never sends encrypted-name queries to the server", async () => {
  const { PassboltClient } = loadTypeScript("src/lib/passbolt.ts", {
    "@raycast/api": {
      getPreferenceValues: () => ({ passboltUrl: baseUrl, privateKey: "/unused", passphrase: "unused" }),
    },
  });
  const client = new PassboltClient();
  client.authenticate = async () => {};
  client.getPrivateKey = async () => userKey;
  const response = await sharedKeyResponse();
  const requested = [];
  client.request = async (url) => {
    requested.push(url);
    let body;
    if (url.startsWith("/resources.json")) body = [resource()];
    else if (url === "/users/me.json") body = { id: userId };
    else if (url.startsWith("/metadata/keys.json")) body = response.keys;
    else throw new Error(`Unexpected request: ${url}`);
    return { ok: true, status: 200, json: async () => ({ header: { status: "success" }, body }) };
  };
  const result = await client.searchResources("SECONDARY");
  assert.equal(result.body.length, 1);
  assert.equal(result.body[0].name, "Example Login");
  assert.ok(requested.every((url) => !url.includes("SECONDARY") && !url.includes("keywords")));
});
