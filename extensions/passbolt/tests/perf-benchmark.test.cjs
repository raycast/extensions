// Synthetic end-to-end latency benchmark for the two vault commands.
//
// What is real: OpenPGP crypto (fresh keys, real metadata/secret encryption and
// decryption), the client's GPGAuth + MFA protocol handling, TOTP parsing and code
// generation, JSON serialization/parsing, and the actual client request sequence.
//
// What is modeled: the server and network. Each mocked HTTP response sleeps for
// `rttMs + responseBytes / bandwidth` before resolving, so wall-clock numbers are
// only meaningful relative to each other. They are diagnostics, never assertions.
//
// Assertions here cover correctness, request counts and payload accounting only:
// they hold for any compliant implementation and must never encode wall-time
// thresholds. Payload byte counts are deterministic and reported per category.
const assert = require("node:assert/strict");
const { before, after, test } = require("node:test");
const { performance } = require("node:perf_hooks");
const openpgp = require("openpgp");
const { TOTP, Secret } = require("otpauth");
const loadTypeScript = require("./load-typescript.cjs");

const BASE_URL = "https://vault.example.test";
const PASSPHRASE = "synthetic-benchmark-passphrase";
const MFA_SECRET = "JBSWY3DPEHPK3PXP";
const FIXED_TIMESTAMP = 1760000000000;

const PROFILES = {
  remote: { label: "remote link (250 ms RTT, 1.0 MB/s)", rttMs: 250, bytesPerMs: 1000 },
  broadband: { label: "broadband (40 ms RTT, 6 MB/s)", rttMs: 40, bytesPerMs: 6000 },
};

// 1837 rows matches the vault size the suite already treats as realistic; the
// 37 TOTP entries match the Authenticator fixture used elsewhere in the suite.
const TOTAL_ROWS = 1837;
const TOTP_ROWS = 37;

let userKey, protectedKeyArmor, serverPublicKey;
const fixture = { rows: [], totpSeeds: new Map(), candidateIds: [], types: [] };
const server = {
  includeInlineSecrets: true,
  mfaPending: true,
  pendingNonce: undefined,
  stats: { requests: [], byCategory: new Map(), bytes: 0, bytesByCategory: new Map(), maxConcurrentSecretRequests: 0 },
};
const realFetch = globalThis.fetch;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function category(path) {
  if (path.startsWith("/auth/")) return "auth";
  if (path.startsWith("/mfa/")) return "mfa";
  if (path.startsWith("/resource-types")) return "resource-types";
  if (path.startsWith("/users/me")) return "users-me";
  if (path.startsWith("/metadata/keys")) return "metadata-keys";
  if (path.startsWith("/secrets/resource/")) return "secret-single";
  if (path.startsWith("/resources.json")) {
    return /filter(\[|%5B)has-id(\]|%5D)(\[|%5D)?/.test(path) ? "resources-bulk" : "resources-list";
  }
  return "other";
}

function resetServer({ includeInlineSecrets = true } = {}) {
  server.includeInlineSecrets = includeInlineSecrets;
  server.mfaPending = true;
  server.pendingNonce = undefined;
  server.stats = {
    requests: [],
    byCategory: new Map(),
    bytes: 0,
    bytesByCategory: new Map(),
    maxConcurrentSecretRequests: 0,
  };
}

function secretRows() {
  let secretRequestsInFlight = 0;
  return {
    enter() {
      secretRequestsInFlight++;
      server.stats.maxConcurrentSecretRequests = Math.max(
        server.stats.maxConcurrentSecretRequests,
        secretRequestsInFlight,
      );
    },
    exit() {
      secretRequestsInFlight--;
    },
  };
}
const secretRequests = secretRows();

async function serverFetch(url, options = {}) {
  const parsed = new URL(url);
  assert.equal(parsed.origin, BASE_URL, "the client only talks to the configured Passbolt instance");
  const path = parsed.pathname + parsed.search;
  const cat = category(parsed.pathname + parsed.search);
  const method = (options.method || "GET").toUpperCase();
  server.stats.requests.push({ method, path: parsed.pathname + parsed.search, category: cat });

  const respond = async (status, payload, headers = {}) => {
    const body = JSON.stringify(payload);
    const bytes = Buffer.byteLength(body);
    server.stats.bytes += bytes;
    server.stats.bytesByCategory.set(cat, (server.stats.bytesByCategory.get(cat) ?? 0) + bytes);
    server.stats.byCategory.set(cat, (server.stats.byCategory.get(cat) ?? 0) + 1);
    const profile = server.profile;
    await sleep(profile.rttMs + bytes / profile.bytesPerMs);
    return new Response(body, { status, headers: { "content-type": "application/json", ...headers } });
  };
  server.profile = server.profile ?? PROFILES.remote;

  // --- authentication (real GPGAuth shape: verify -> login stage 1 -> stage 2 -> MFA) ---
  if (parsed.pathname === "/auth/verify.json") {
    return respond(200, {
      header: { status: "success", code: 200 },
      body: { fingerprint: serverPublicKey.getFingerprint(), keydata: serverPublicKey.armor() },
    });
  }
  if (parsed.pathname === "/auth/login.json" && method === "POST") {
    const auth = JSON.parse(options.body).data.gpg_auth;
    if (auth.user_token_result === undefined) {
      const nonce = `synthetic-nonce-${Math.random().toString(36).slice(2)}`;
      server.pendingNonce = nonce;
      const encrypted = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: nonce }),
        encryptionKeys: userKey.toPublic(),
      });
      return respond(
        200,
        { header: { status: "success", code: 200 }, body: null },
        {
          "x-gpgauth-user-auth-token": encodeURIComponent(encrypted),
          "set-cookie": "passbolt_session=synthetic-session; Path=/",
        },
      );
    }
    assert.equal(auth.user_token_result, server.pendingNonce, "the client must echo the decrypted nonce");
    return respond(200, { header: { status: "success", code: 200 }, body: { mfa_providers: ["totp"] } });
  }
  if (parsed.pathname === "/mfa/verify/totp.json" && method === "POST") {
    const { totp } = JSON.parse(options.body);
    const valid = TOTP.validate({ token: totp, secret: Secret.fromBase32(MFA_SECRET), window: 1 });
    if (valid === null)
      return respond(403, { header: { status: "error", code: 403 }, body: { mfa_providers: ["totp"] } });
    server.mfaPending = false;
    return respond(200, { header: { status: "success", code: 200 }, body: null });
  }

  // --- vault data ---
  if (server.mfaPending && !parsed.pathname.startsWith("/auth/")) {
    return respond(403, { header: { status: "error", code: 403 }, body: { mfa_providers: ["totp"] } });
  }
  if (parsed.pathname === "/resource-types.json") {
    return respond(200, { header: { status: "success", code: 200 }, body: fixture.types });
  }
  if (parsed.pathname === "/resources.json") {
    const wantsSecrets = parsed.searchParams.get("contain[secret]") === "1";
    const ids = parsed.searchParams.getAll("filter[has-id][]");
    const selected = ids.length ? fixture.rows.filter((row) => ids.includes(row.id)) : fixture.rows;
    // The real API embeds secrets only for contain[secret]=1; a modeled deployment may
    // omit them anyway, exercising the client's per-entry secret fallback.
    const rows = selected.map((row) => {
      const { secret, ...rest } = row;
      return wantsSecrets && server.includeInlineSecrets ? { ...rest, secrets: [secret] } : rest;
    });
    return respond(200, { header: { status: "success", code: 200 }, body: rows });
  }
  const single = parsed.pathname.match(/^\/secrets\/resource\/([^/]+)\.json$/);
  if (single) {
    secretRequests.enter();
    try {
      const row = fixture.rows.find((candidate) => candidate.id === decodeURIComponent(single[1]));
      if (!row) return await respond(404, { header: { status: "error", code: 404 }, body: null });
      return await respond(200, { header: { status: "success", code: 200 }, body: row.secret });
    } finally {
      secretRequests.exit();
    }
  }
  return respond(404, { header: { status: "error", code: 404 }, body: null });
}

function newClient() {
  const { PassboltClient } = loadTypeScript("src/lib/passbolt.ts", {
    "@raycast/api": {
      getPreferenceValues: () => ({
        passboltUrl: BASE_URL,
        privateKey: "/synthetic/bench.key",
        passphrase: PASSPHRASE,
        totpSecret: MFA_SECRET,
      }),
    },
    "fs/promises": { readFile: async () => protectedKeyArmor },
  });
  return new PassboltClient();
}

async function measure(command, profileName, { includeInlineSecrets = true } = {}) {
  const profile = PROFILES[profileName];
  server.profile = profile;
  resetServer({ includeInlineSecrets });
  const client = newClient();
  const marks = { firstItemMs: undefined, firstCodeMs: undefined, fullMs: undefined };
  const started = performance.now();
  const onProgress = (progress) => {
    const elapsed = performance.now() - started;
    if (progress.items.length > 0 && marks.firstItemMs === undefined) marks.firstItemMs = elapsed;
    if (marks.firstCodeMs === undefined && progress.items.some((item) => item.totp)) marks.firstCodeMs = elapsed;
  };
  const result =
    command === "search"
      ? await client.searchResources("", { onProgress })
      : await client.getTotpResources({ onProgress });
  marks.fullMs = performance.now() - started;
  return { marks, result, stats: server.stats };
}

function fmt(ms) {
  return ms === undefined ? "n/a" : `${ms.toFixed(0)} ms`;
}

function report(label, { marks, stats }) {
  const perCategory = [...stats.byCategory.entries()]
    .map(([name, count]) => `${name}=${count} (${((stats.bytesByCategory.get(name) ?? 0) / 1000).toFixed(0)} kB)`)
    .join(", ");
  return (
    `${label}: first-item=${fmt(marks.firstItemMs)} first-code=${fmt(marks.firstCodeMs)} full=${fmt(marks.fullMs)} | ` +
    `requests=${stats.requests.length} payload=${(stats.bytes / 1000).toFixed(0)} kB | ${perCategory}`
  );
}

before(async () => {
  const userPair = await openpgp.generateKey({
    type: "ecc",
    curve: "curve25519",
    userIDs: [{ name: "Benchmark user" }],
    passphrase: PASSPHRASE,
    format: "object",
  });
  userKey = userPair.privateKey;
  protectedKeyArmor = userPair.privateKey.armor();
  userKey = await openpgp.decryptKey({ privateKey: userKey, passphrase: PASSPHRASE });
  serverPublicKey = (
    await openpgp.generateKey({
      type: "ecc",
      curve: "curve25519",
      userIDs: [{ name: "Benchmark server" }],
      format: "object",
    })
  ).privateKey.toPublic();

  async function encrypt(value) {
    return openpgp.encrypt({
      message: await openpgp.createMessage({ text: typeof value === "string" ? value : JSON.stringify(value) }),
      encryptionKeys: userKey.toPublic(),
    });
  }

  fixture.types = [
    {
      id: "password-type",
      slug: "v5-default",
      name: "Password",
      definition: { secret: { type: "object", properties: { password: { type: "string" } } } },
    },
    { id: "totp-type", slug: "v5-default-with-totp", name: "Password and TOTP" },
  ];

  const sharedMetadata = await encrypt({
    object_type: "PASSBOLT_RESOURCE_METADATA",
    resource_type_id: "password-type",
    name: "Benchmark Password Entry",
    username: "shared@example.test",
    uris: ["https://shared.example.test"],
    description: "shared synthetic metadata",
  });
  const sharedSecret = await encrypt({
    object_type: "PASSBOLT_SECRET_DATA",
    password: "xK9!mQ2#zL7$pR4&vB6^nT8*wD3",
  });

  for (let index = 0; index < TOTAL_ROWS; index++) {
    const isTotp = index % Math.floor(TOTAL_ROWS / TOTP_ROWS) === 0 && fixture.candidateIds.length < TOTP_ROWS;
    const id = `res-${String(index).padStart(4, "0")}`;
    if (isTotp) {
      fixture.candidateIds.push(id);
      const seed = Secret.fromUTF8(`totp-seed-${index}-${id}`).base32;
      fixture.totpSeeds.set(id, seed);
      fixture.rows.push({
        id,
        resource_type_id: "totp-type",
        metadata_key_type: "user_key",
        metadata_key_id: null,
        metadata: await encrypt({
          object_type: "PASSBOLT_RESOURCE_METADATA",
          resource_type_id: "totp-type",
          name: `Benchmark TOTP ${fixture.candidateIds.length}`,
          username: `totp-${fixture.candidateIds.length}@example.test`,
          uris: [`https://totp-${fixture.candidateIds.length}.example.test`],
          description: "synthetic authenticator entry",
        }),
        secret: {
          id: `secret-${id}`,
          user_id: "bench-user",
          resource_id: id,
          data: await encrypt({
            object_type: "PASSBOLT_SECRET_DATA",
            password: `password-${id}`,
            totp: { secret_key: seed, algorithm: "SHA1", digits: 6, period: 30 },
          }),
        },
        tags: [{ id: "tag-1", slug: "work", is_shared: true }],
        favorite: null,
        created: "2026-01-01T00:00:00+00:00",
        modified: "2026-01-02T00:00:00+00:00",
        deleted: false,
      });
    } else {
      fixture.rows.push({
        id,
        resource_type_id: "password-type",
        metadata_key_type: "user_key",
        metadata_key_id: null,
        metadata: sharedMetadata,
        secret: { id: `secret-${id}`, user_id: "bench-user", resource_id: id, data: sharedSecret },
        tags: [],
        favorite: null,
        created: "2026-01-01T00:00:00+00:00",
        modified: "2026-01-02T00:00:00+00:00",
        deleted: false,
      });
    }
  }
  assert.equal(fixture.candidateIds.length, TOTP_ROWS);
  globalThis.fetch = serverFetch;
});

after(() => {
  globalThis.fetch = realFetch;
});

for (const profileName of ["remote", "broadband"]) {
  test(`Authenticator load under ${PROFILES[profileName].label}`, async (t) => {
    const run = await measure("totp", profileName);
    t.diagnostic(report(`authenticator ${profileName}`, run));
    const { result } = run;
    assert.equal(result.totalResources, TOTAL_ROWS);
    assert.equal(result.candidates, TOTP_ROWS);
    assert.deepEqual(
      result.items.map((item) => item.id),
      fixture.candidateIds,
      "items stay in server order and are associated with their own resource",
    );
    for (const item of result.items) {
      assert.equal(item.totp_error, undefined, item.id);
      assert.equal(item.metadata_error, undefined, item.id);
      const expected = new TOTP({ secret: fixture.totpSeeds.get(item.id), digits: 6, period: 30 }).generate({
        timestamp: FIXED_TIMESTAMP,
      });
      assert.equal(
        new TOTP({
          secret: item.totp.secretKey,
          algorithm: item.totp.algorithm,
          digits: item.totp.digits,
          period: item.totp.period,
        }).generate({ timestamp: FIXED_TIMESTAMP }),
        expected,
        `code for ${item.id} must come from its own secret`,
      );
    }
    const categories = new Set(run.stats.requests.map((request) => request.category));
    assert.ok(categories.has("auth") && categories.has("mfa") && categories.has("resources-list"));
    assert.ok(run.stats.requests.length >= 5);
    assert.ok(run.stats.maxConcurrentSecretRequests <= 8, "single-secret requests stay bounded");
  });
}

for (const profileName of ["remote", "broadband"]) {
  test(`Password search load under ${PROFILES[profileName].label}`, async (t) => {
    const run = await measure("search", profileName);
    t.diagnostic(report(`search ${profileName}`, run));
    const { result } = run;
    assert.equal(result.body.length, TOTAL_ROWS);
    assert.deepEqual(
      result.body.map((item) => item.id),
      fixture.rows.map((row) => row.id),
      "search keeps the server order of every entry",
    );
    assert.ok(result.body.every((item) => item.name.startsWith("Benchmark")));
    assert.ok(result.body.some((item) => item.totp === undefined));
    const categories = new Set(run.stats.requests.map((request) => request.category));
    assert.ok(categories.has("auth") && categories.has("resources-list"));
    assert.ok(!categories.has("secret-single"), "search never downloads secret payloads");
  });
}

test("Authenticator load when the server omits inline secrets (fallback path)", async (t) => {
  const run = await measure("totp", "remote", { includeInlineSecrets: false });
  t.diagnostic(report("authenticator remote (no inline secrets)", run));
  assert.equal(run.result.items.length, TOTP_ROWS);
  assert.ok(run.result.items.every((item) => item.totp && !item.totp_error));
  assert.ok(run.stats.maxConcurrentSecretRequests <= 8, "fallback requests stay within the worker limit");
});
