const assert = require("node:assert/strict");
const { before, test } = require("node:test");
const { performance } = require("node:perf_hooks");
const openpgp = require("openpgp");
const { Secret } = require("otpauth");
const loadTypeScript = require("./load-typescript.cjs");
const {
  resourceTypeSupportsTotp,
  parseTotpConfiguration,
  createTotpGenerator,
  filterTotpResources,
  websiteMatchScore,
  websiteHostname,
  rankTotpResources,
} = loadTypeScript("src/utils/totp.ts");

const secretKey = "JBSWY3DPEHPK3PXP";
const config = { secret_key: secretKey, algorithm: "SHA1", digits: 6, period: 30 };
const types = [
  {
    id: "password-type",
    slug: "v5-default",
    name: "Password",
    definition: { secret: { properties: { password: {} } } },
  },
  { id: "totp-type", slug: "v5-default-with-totp", name: "Password and TOTP" },
];
let userKey, protectedKey, encryptedSecret, encryptedMetadata;
before(async () => {
  userKey = (
    await openpgp.generateKey({
      type: "ecc",
      curve: "curve25519",
      userIDs: [{ name: "Synthetic test" }],
      format: "object",
    })
  ).privateKey;
  protectedKey = await openpgp.encryptKey({ privateKey: userKey, passphrase: "synthetic-test-passphrase" });
  async function encrypt(data) {
    return openpgp.encrypt({
      message: await openpgp.createMessage({ text: JSON.stringify(data) }),
      encryptionKeys: userKey.toPublic(),
    });
  }
  encryptedSecret = await encrypt({
    object_type: "PASSBOLT_SECRET_DATA",
    password: "synthetic-password",
    totp: config,
  });
  encryptedMetadata = await encrypt({
    object_type: "PASSBOLT_RESOURCE_METADATA",
    resource_type_id: "totp-type",
    name: "Cloudflare",
    username: "info@example.test",
    uris: ["https://dash.cloudflare.com"],
    description: "Synthetic account",
  });
});

function clientFor(resources, resourceTypes = types) {
  const { PassboltClient } = loadTypeScript("src/lib/passbolt.ts", {
    "@raycast/api": {
      getPreferenceValues: () => ({
        passboltUrl: "https://vault.example.test",
        privateKey: "/unused",
        passphrase: "unused",
      }),
    },
  });
  const client = new PassboltClient();
  client.authenticate = async () => {};
  const calls = [];
  client.request = async (url) => {
    calls.push(url);
    let body;
    if (url.startsWith("/resources.json")) body = resources;
    else if (url === "/resource-types.json") body = resourceTypes;
    else throw new Error(`Unexpected per-entry HTTP request: ${url}`);
    return { ok: true, status: 200, json: async () => ({ header: { status: "success" }, body }) };
  };
  return { client, calls };
}

function resource(id, overrides = {}) {
  return { id, resource_type_id: "totp-type", name: id, username: "", uri: "", description: "", ...overrides };
}

test("password-plus-TOTP entries retain their TOTP configuration instead of returning just the password", () => {
  const result = parseTotpConfiguration(
    JSON.stringify({ password: "password that must not replace the JSON", totp: config }),
  );
  assert.equal(result.secretKey, secretKey);
  assert.equal(result.digits, 6);
  assert.equal(result.period, 30);
  assert.equal(parseTotpConfiguration(JSON.stringify({ password: "password only" })), undefined);
});

test("resource schemas select TOTP and standalone types while unknown schemas remain eligible", () => {
  assert.equal(resourceTypeSupportsTotp(types[0]), false);
  assert.equal(resourceTypeSupportsTotp(types[1]), true);
  assert.equal(resourceTypeSupportsTotp({ slug: "totp" }), true);
  assert.equal(resourceTypeSupportsTotp({ slug: "v5-totp-standalone" }), true);
  assert.equal(
    resourceTypeSupportsTotp({ slug: "custom", definition: JSON.stringify({ secret: { properties: { totp: {} } } }) }),
    true,
  );
  assert.equal(
    resourceTypeSupportsTotp({ slug: "custom", definition: { secret: { properties: { password: {} } } } }),
    false,
  );
  assert.equal(resourceTypeSupportsTotp({ slug: "custom", definition: "invalid JSON" }), undefined);
  assert.equal(resourceTypeSupportsTotp(undefined), undefined);
});

test("TOTP output matches RFC 6238 SHA1, SHA256, and SHA512 vectors", () => {
  for (const [algorithm, utf8, expected] of [
    ["SHA1", "12345678901234567890", "94287082"],
    ["SHA256", "12345678901234567890123456789012", "46119246"],
    ["SHA512", "1234567890123456789012345678901234567890123456789012345678901234", "90693936"],
  ]) {
    const parsed = parseTotpConfiguration(
      JSON.stringify({ totp: { secret_key: Secret.fromUTF8(utf8).base32, algorithm, digits: 8 } }),
    );
    assert.equal(createTotpGenerator(parsed).generate({ timestamp: 59000 }), expected, algorithm);
  }
});

test("custom periods and otpauth URI configuration are preserved", () => {
  const parsed = parseTotpConfiguration(
    JSON.stringify({ totp: { ...config, period: 60, digits: 8, algorithm: "SHA-256" } }),
  );
  assert.equal(parsed.algorithm, "SHA256");
  assert.equal(parsed.period, 60);
  assert.equal(createTotpGenerator(parsed).remaining({ timestamp: 59000 }), 1000);
  const uri = parseTotpConfiguration(
    JSON.stringify({ totp: `otpauth://totp/Oracle:info?secret=${secretKey}&issuer=Oracle&period=60&digits=8` }),
  );
  assert.equal(uri.issuer, "Oracle");
  assert.match(uri.label, /info/);
  assert.equal(uri.digits, 8);
  assert.equal(uri.period, 60);
});

test("invalid TOTP configurations are rejected before showing copy actions", () => {
  for (const value of [
    { ...config, digits: 5 },
    { ...config, period: 0 },
    { ...config, algorithm: "MD5" },
    { secret_key: "INVALID!" },
  ]) {
    assert.throws(() => parseTotpConfiguration(JSON.stringify({ totp: value })));
  }
});

test("Authenticator searches names, usernames, every URL, tags, notes, acronyms, and Oracle's OCI alias", () => {
  const entries = [
    resource("cloudflare", {
      name: "Cloudflare",
      username: "info@example.test",
      uri: "https://dash.cloudflare.com",
      tags: [{ slug: "work" }],
    }),
    resource("oracle", {
      name: "Oracle",
      username: "admin",
      uris: ["https://cloud.oracle.com", "https://tenant.oraclecloud.com"],
      description: "production tenancy",
    }),
    resource("aws", { name: "Amazon Web Services", username: "operations" }),
  ];
  for (const [query, expected] of [
    ["cloudflare", "cloudflare"],
    ["INFO", "cloudflare"],
    ["cloudflare info", "cloudflare"],
    ["work", "cloudflare"],
    ["OCI", "oracle"],
    ["tenant.oraclecloud", "oracle"],
    ["production", "oracle"],
    ["aws", "aws"],
  ]) {
    assert.deepEqual(
      filterTotpResources(entries, query).map((entry) => entry.id),
      [expected],
      query,
    );
  }
  assert.equal(filterTotpResources(entries, "nonexistent").length, 0);
  assert.equal(filterTotpResources(entries, "   ").length, 3);
});

test("current-website matching ranks exact hosts and sibling subdomains without matching lookalike domains", () => {
  const exact = resource("exact", { uri: "https://dash.cloudflare.com" });
  const sibling = resource("sibling", { uri: "https://www.cloudflare.com" });
  const lookalike = resource("lookalike", { uri: "https://cloudflare.com.attacker.test", favorite: true });
  assert.equal(websiteMatchScore(exact, "https://dash.cloudflare.com/login"), 2);
  assert.equal(websiteMatchScore(sibling, "https://dash.cloudflare.com/login"), 1);
  assert.equal(websiteMatchScore(lookalike, "https://dash.cloudflare.com/login"), 0);
  assert.deepEqual(
    rankTotpResources([lookalike, sibling, exact], "https://dash.cloudflare.com").map((r) => r.id),
    ["exact", "sibling", "lookalike"],
  );
  assert.equal(
    websiteMatchScore(
      resource("secondary", { uris: ["https://unrelated.test", "https://dash.cloudflare.com"] }),
      "https://dash.cloudflare.com",
    ),
    2,
  );
});

test("website matching respects public and private suffixes, IPs, and non-web URLs", () => {
  assert.equal(websiteMatchScore(resource("x", { uri: "https://a.co.uk" }), "https://b.co.uk"), 0);
  assert.equal(websiteMatchScore(resource("x", { uri: "https://a.github.io" }), "https://b.github.io"), 0);
  assert.equal(websiteMatchScore(resource("x", { uri: "https://192.168.1.1" }), "https://192.168.1.2"), 0);
  assert.equal(websiteMatchScore(resource("x", { uri: "http://localhost:8080" }), "http://localhost:9000"), 2);
  assert.equal(websiteHostname("mailto:info@cloudflare.com"), undefined);
  assert.equal(websiteHostname("javascript:alert(1)"), undefined);
  assert.equal(websiteHostname("example.com:8443/login"), "example.com");
});

test("an 1837-entry vault makes two collection requests, decrypts only 37 TOTP entries, and unlocks the key once", async (t) => {
  const entries = [
    ...Array.from({ length: 1800 }, (_, i) =>
      resource(`password-${i}`, { resource_type_id: "password-type", metadata: "must never be decrypted" }),
    ),
    ...Array.from({ length: 37 }, (_, i) =>
      resource(`totp-${i}`, {
        name: undefined,
        metadata: encryptedMetadata,
        metadata_key_type: "user_key",
        secrets: [{ data: encryptedSecret }],
      }),
    ),
  ];
  const { client, calls } = clientFor(entries);
  let keyLoads = 0,
    decryptions = 0;
  client.readPrivateKey = async () => {
    keyLoads++;
    return openpgp.decryptKey({ privateKey: protectedKey, passphrase: "synthetic-test-passphrase" });
  };
  const decryptSecretData = client.decryptSecretData.bind(client);
  client.decryptSecretData = async (data) => {
    decryptions++;
    return decryptSecretData(data);
  };
  const updates = [];
  const started = performance.now();
  const result = await client.getTotpResources({ onProgress: (progress) => updates.push(progress) });
  t.diagnostic(
    `Synthetic vault: ${(performance.now() - started).toFixed(0)} ms, ${calls.length} mocked collection requests, ${decryptions} real secret decryptions; network/authentication excluded.`,
  );
  assert.equal(result.totalResources, 1837);
  assert.equal(result.candidates, 37);
  assert.equal(result.processed, 37);
  assert.equal(result.items.length, 37);
  assert.equal(calls.length, 2);
  assert.equal(decryptions, 37);
  assert.equal(keyLoads, 1);
  assert.ok(
    result.items.every(
      (entry) =>
        entry.name === "Cloudflare" &&
        entry.totp?.secretKey === secretKey &&
        !entry.totp_error &&
        !entry.metadata_error,
    ),
  );
  assert.ok(
    updates.some((progress) => progress.items.length > 0 && progress.processed < progress.candidates),
    "results appear before the entire load completes",
  );
  assert.equal(filterTotpResources(result.items, "info").length, 37);
  assert.equal(
    await client.decryptSecret(encryptedSecret),
    "synthetic-password",
    "password-copy behavior remains intact",
  );
  assert.equal(keyLoads, 1);
});

test("missing included secrets use a bounded fallback and failed entries remain visible", async () => {
  const entries = [resource("fallback"), resource("broken", { secrets: [{ data: "broken" }] })];
  const { client } = clientFor(entries);
  let fallback = 0;
  client.getSecret = async () => {
    fallback++;
    return { data: "valid" };
  };
  client.decryptSecretData = async (data) => {
    if (data === "broken") throw new Error("private diagnostic must not escape");
    return JSON.stringify({ password: "combined entry", totp: config });
  };
  const result = await client.getTotpResources();
  assert.equal(fallback, 1);
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].totp.secretKey, secretKey);
  assert.ok(result.items[1].totp_error);
  assert.ok(!result.items[1].totp_error.includes("private diagnostic"));
});

test("unknown resource types are inspected without dropping their TOTP accounts", async () => {
  const { client } = clientFor([resource("custom", { resource_type_id: "unknown", secrets: [{ data: "valid" }] })]);
  client.decryptSecretData = async () => JSON.stringify({ totp: config });
  const result = await client.getTotpResources();
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].totp.secretKey, secretKey);
});

test("closing the command cancels the entries still waiting and a later refresh recovers", async () => {
  const controller = new AbortController();
  const { client } = clientFor(
    Array.from({ length: 20 }, (_, i) => resource(String(i), { secrets: [{ data: "valid" }] })),
  );
  let processed = 0;
  client.decryptSecretData = async () => {
    processed++;
    return JSON.stringify({ totp: config });
  };
  await assert.rejects(
    client.getTotpResources({
      signal: controller.signal,
      onProgress: (progress) => {
        if (progress.processed > 0) controller.abort();
      },
    }),
    /abort/i,
  );
  assert.ok(processed < 20, "entries still waiting to start are not processed after cancellation");
  // Refresh Accounts runs the same load again: cancellation must not poison the client.
  const result = await client.getTotpResources();
  assert.equal(result.items.length, 20);
  assert.ok(result.items.every((item) => item.totp?.secretKey === secretKey));
});

test("current-website lookup uses launch context or an available browser without prompting", async () => {
  let calls = 0;
  const api = {
    environment: { canAccess: () => false },
    BrowserExtension: {
      getTabs: async () => {
        calls++;
        return [];
      },
    },
  };
  const { getActiveWebsiteUrl } = loadTypeScript("src/lib/active-website.ts", { "@raycast/api": api });
  assert.equal(await getActiveWebsiteUrl("https://dash.cloudflare.com"), "https://dash.cloudflare.com");
  assert.equal(await getActiveWebsiteUrl(), undefined);
  assert.equal(calls, 0);
  api.environment.canAccess = () => true;
  api.BrowserExtension.getTabs = async () => [{ url: "https://dash.cloudflare.com", active: true }];
  assert.equal(await getActiveWebsiteUrl(), "https://dash.cloudflare.com");
  api.BrowserExtension.getTabs = async () => [
    { url: "https://one.test", active: true },
    { url: "https://two.test", active: true },
  ];
  assert.equal(await getActiveWebsiteUrl(), undefined, "ambiguous active windows do not select the wrong account");
  api.BrowserExtension.getTabs = async () => {
    throw new Error("Browser unavailable");
  };
  assert.equal(await getActiveWebsiteUrl(), undefined);
});
