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

test("every search term must match, and each term may match a different field", () => {
  const entries = [
    {
      id: "match",
      name: "Office Portal",
      username: "anna.pfeiffer@example.test",
      uri: "https://portal.example.test",
      uris: ["https://portal.example.test", "https://backup.example.test"],
      description: "Renewal in March",
      tags: [{ id: "tag-1", slug: "contracts", is_shared: true }],
    },
    {
      id: "other",
      name: "Warehouse",
      username: "someone@example.test",
      uri: "https://shop.example.test",
      description: "Stock list",
      tags: [{ id: "tag-2", slug: "logistics", is_shared: true }],
    },
  ];
  // 'pfeiffer' only matches the email, 'office' only matches the name: both must match.
  assert.deepEqual(
    filterResources(entries, "pfeiffer office").map((entry) => entry.id),
    ["match"],
  );
  // Order of terms is irrelevant and remaining terms may match other fields.
  assert.deepEqual(
    filterResources(entries, "office pfeiffer").map((entry) => entry.id),
    ["match"],
  );
  for (const query of ["office contracts", "office renewal", "pfeiffer backup", "office portal example.test"]) {
    assert.deepEqual(filterResources(entries, query).map((entry) => entry.id), ["match"], query);
  }
  // A missing term excludes the entry even when the other terms match.
  assert.equal(filterResources(entries, "pfeiffer absent").length, 0);
  // Blank queries still list everything.
  assert.equal(filterResources(entries, "   ").length, 2);
});

test("a rejected user-key load can recover on the same decryptor", async () => {
  let userLoads = 0;
  const decoder = decryptor(undefined, async () => {
    if (++userLoads === 1) throw new Error("Temporary key failure");
    return userKey;
  });
  const entries = [resource({ metadata_key_type: "user_key", metadata: personalMetadata })];
  assert.ok((await decoder.decryptResources(entries))[0].metadata_error);
  const [result] = await decoder.decryptResources(entries);
  assert.equal(result.name, "Personal Login");
  assert.equal(result.metadata_error, undefined);
  assert.equal(userLoads, 2);
});

test("a failed shared-key list stays cached until refresh and then recovers", async () => {
  let keyLoads = 0;
  const decoder = decryptor(async () => {
    if (++keyLoads === 1) throw new Error("Temporary network failure");
    return sharedKeyResponse();
  });
  const entries = [resource(), resource({ id: "resource-2" })];
  assert.ok((await decoder.decryptResources(entries)).every((entry) => entry.metadata_error));
  assert.ok((await decoder.decryptResources(entries)).every((entry) => entry.metadata_error));
  assert.equal(keyLoads, 1, "failed key-list requests are not retried during the same load");
  decoder.clearSharedKeys();
  const results = await decoder.decryptResources(entries);
  assert.ok(results.every((entry) => entry.name === "Example Login" && !entry.metadata_error));
  assert.equal(keyLoads, 2, "concurrent resources share each key-list request");
});

for (const command of ["searchResources", "getTotpResources"]) {
  test(`${command} makes one failed shared-key request pair for 1800 entries and retries on reload`, async () => {
    const { PassboltClient } = loadTypeScript("src/lib/passbolt.ts", {
      "@raycast/api": {
        getPreferenceValues: () => ({ passboltUrl: baseUrl, privateKey: "/unused", passphrase: "unused" }),
      },
    });
    const client = new PassboltClient();
    client.authenticate = async () => {};
    client.readPrivateKey = async () => userKey;
    client.decryptSecretData = async () => JSON.stringify({ totp: { secret_key: "JBSWY3DPEHPK3PXP" } });
    const shared = await sharedKeyResponse();
    let failing = true,
      userRequests = 0,
      keyRequests = 0;
    client.request = async (url) => {
      let body;
      if (url.startsWith("/resources.json")) {
        body = failing
          ? Array.from({ length: 1800 }, (_, index) =>
              resource({
                id: `resource-${index}`,
                metadata_key_id: `${keyId}-${index % 17}`,
                secrets: [{ data: "included-secret" }],
              }),
            )
          : [resource({ secrets: [{ data: "included-secret" }] })];
      } else if (url === "/resource-types.json") body = [{ id: typeId, slug: "totp" }];
      else if (url === "/users/me.json") {
        userRequests++;
        body = { id: userId };
      } else if (url.startsWith("/metadata/keys.json")) {
        keyRequests++;
        if (failing) return { ok: false, status: 503 };
        body = shared.keys;
      } else throw new Error(`Unexpected request: ${url}`);
      return { ok: true, status: 200, json: async () => ({ header: { status: "success" }, body }) };
    };
    const load = async () =>
      command === "searchResources" ? (await client.searchResources("")).body : (await client.getTotpResources()).items;

    const failed = await load();
    assert.equal(failed.length, 1800);
    assert.ok(failed.every((entry) => entry.metadata_error));
    assert.equal(userRequests, 1, "one user request across all batches and key IDs");
    assert.equal(keyRequests, 1, "one shared-key request across all batches and key IDs");
    failing = false;
    const [recovered] = await load();
    assert.equal(recovered.name, "Example Login");
    assert.equal(recovered.metadata_error, undefined);
    assert.equal(userRequests, 2, "a new load retries after recovery");
    assert.equal(keyRequests, 2, "a new load retries after recovery");
  });
}

test("a failed shared-key unwrap is retried without refetching a successful key list", async () => {
  const response = await sharedKeyResponse();
  const envelope = response.keys[0].metadata_private_keys.find((key) => key.user_id === userId);
  const validData = envelope.data;
  envelope.data = "temporarily unreadable key envelope";
  let keyLoads = 0;
  const decoder = decryptor(async () => {
    keyLoads++;
    return response;
  });
  assert.ok((await decoder.decryptResources([resource()]))[0].metadata_error);
  envelope.data = validData;
  const [result] = await decoder.decryptResources([resource()]);
  assert.equal(result.name, "Example Login");
  assert.equal(result.metadata_error, undefined);
  assert.equal(keyLoads, 1);
});

test("an older failed load cannot evict shared keys loaded by a refresh", async () => {
  let rejectFirst, notifyStarted;
  const started = new Promise((resolve) => {
    notifyStarted = resolve;
  });
  const firstResponse = new Promise((_, reject) => {
    rejectFirst = reject;
  });
  let keyLoads = 0;
  const decoder = decryptor(() => {
    if (++keyLoads === 1) {
      notifyStarted();
      return firstResponse;
    }
    return sharedKeyResponse();
  });
  const initial = decoder.decryptResources([resource()]);
  await started;
  decoder.clearSharedKeys();
  assert.equal((await decoder.decryptResources([resource()]))[0].name, "Example Login");
  rejectFirst(new Error("Older request failed after refresh"));
  assert.ok((await initial)[0].metadata_error);
  assert.equal((await decoder.decryptResources([resource()]))[0].name, "Example Login");
  assert.equal(keyLoads, 2, "the refreshed key list remains cached");
});

test("refreshing TOTP accounts reloads failed, missing, and previously decrypted shared keys", async () => {
  const { PassboltClient } = loadTypeScript("src/lib/passbolt.ts", {
    "@raycast/api": {
      getPreferenceValues: () => ({ passboltUrl: baseUrl, privateKey: "/unused", passphrase: "unused" }),
    },
  });
  const client = new PassboltClient();
  client.authenticate = async () => {};
  let userLoads = 0;
  client.readPrivateKey = async () => {
    userLoads++;
    return userKey;
  };
  client.decryptSecretData = async () =>
    JSON.stringify({ totp: { secret_key: "JBSWY3DPEHPK3PXP", digits: 6, period: 30, algorithm: "SHA1" } });
  const response = await sharedKeyResponse();
  let keyLoads = 0;
  client.request = async (url) => {
    let body;
    if (url.startsWith("/resources.json")) body = [resource({ secrets: [{ data: "included-secret" }] })];
    else if (url === "/resource-types.json") body = [{ id: typeId, slug: "totp" }];
    else if (url === "/users/me.json") body = { id: userId };
    else if (url.startsWith("/metadata/keys.json")) {
      keyLoads++;
      if (keyLoads === 1) throw new Error("Temporary network failure");
      body = keyLoads === 3 ? response.keys : [];
    } else throw new Error(`Unexpected request: ${url}`);
    return { ok: true, status: 200, json: async () => ({ header: { status: "success" }, body }) };
  };

  const load = async () => (await client.getTotpResources()).items[0];
  assert.ok((await load()).metadata_error, "failed request remains visible");
  assert.match((await load()).metadata_error, /not been shared/, "refresh retries the failed request");
  const recovered = await load();
  assert.equal(recovered.name, "Example Login");
  assert.equal(recovered.metadata_error, undefined, "refresh discovers a newly shared key");
  assert.ok(recovered.totp);
  assert.match((await load()).metadata_error, /not been shared/, "refresh discards previously decrypted shared keys");
  assert.equal(keyLoads, 4);
  assert.equal(userLoads, 1, "successful user-key loads remain cached across refreshes");
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

test("malformed metadata and wrong object types produce safe errors", async () => {
  for (const payload of [
    "sensitive-test-data",
    [],
    metadata({ name: null }),
    metadata({ object_type: "PASSBOLT_SECRET_DATA" }),
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

test("a stale or missing metadata resource type id does not hide the entry", async () => {
  // Passbolt only advises writers to keep the clear-text and metadata ids consistent, and its
  // own migration bug (API PB-39512) left legitimate vaults where they differ. The decrypted
  // metadata is trusted for display; the clear-text row keeps driving type decisions.
  for (const override of [{ resource_type_id: "stale-type" }, { resource_type_id: undefined }, { resource_type_id: 42 }]) {
    const encrypted = await encrypt(metadata(override), userKey);
    const [result] = await decryptor().decryptResources([
      resource({ metadata_key_type: "user_key", metadata: encrypted }),
    ]);
    assert.equal(result.name, "Example Login");
    assert.equal(result.username, "alice@example.test");
    assert.deepEqual(result.uris, metadata().uris);
    assert.equal(result.metadata_error, undefined);
    assert.equal(result.resource_type_id, typeId, "the clear-text row keeps its resource type id");
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
