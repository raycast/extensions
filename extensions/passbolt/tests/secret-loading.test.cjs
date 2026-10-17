// Regression coverage for the Authenticator's batched secret loading and the
// Search command's cancellation: what changed is how data is requested and how
// entries stream in, so these tests pin the observable contract — which secrets
// are ever downloaded, how requests are bounded, that entries keep their own
// secrets and order regardless of server response order, and that failures and
// cancellation stay visible and recoverable.
const assert = require("node:assert/strict");
const { before, test } = require("node:test");
const openpgp = require("openpgp");
const { TOTP, Secret } = require("otpauth");
const loadTypeScript = require("./load-typescript.cjs");

const baseUrl = "https://vault.example.test";
const FIXED_TIMESTAMP = 1760000000000;
const types = [
  {
    id: "password-type",
    slug: "v5-default",
    name: "Password",
    definition: { secret: { type: "object", properties: { password: { type: "string" } } } },
  },
  { id: "totp-type", slug: "v5-default-with-totp", name: "Password and TOTP" },
];
let userKey;

before(async () => {
  userKey = (
    await openpgp.generateKey({
      type: "ecc",
      curve: "curve25519",
      userIDs: [{ name: "Synthetic test" }],
      format: "object",
    })
  ).privateKey;
});

async function encrypt(value) {
  return openpgp.encrypt({
    message: await openpgp.createMessage({ text: typeof value === "string" ? value : JSON.stringify(value) }),
    encryptionKeys: userKey.toPublic(),
  });
}

function seedFor(id) {
  return Secret.fromUTF8(`seed-${id}`).base32;
}

function expectedCode(id) {
  return new TOTP({ secret: seedFor(id), digits: 6, period: 30 }).generate({ timestamp: FIXED_TIMESTAMP });
}

async function makeRow(id, { typeId = "totp-type", secret = true } = {}) {
  return {
    id,
    resource_type_id: typeId,
    metadata_key_type: "user_key",
    metadata_key_id: null,
    metadata: await encrypt({
      object_type: "PASSBOLT_RESOURCE_METADATA",
      resource_type_id: typeId,
      name: `Entry ${id}`,
      username: `${id}@example.test`,
      uris: [`https://${id}.example.test`, `https://secondary-${id}.example.test`],
      description: `notes for ${id}`,
    }),
    secret: secret
      ? {
          id: `secret-${id}`,
          user_id: "user-1",
          resource_id: id,
          data: await encrypt({
            object_type: "PASSBOLT_SECRET_DATA",
            password: `password-${id}`,
            totp: { secret_key: seedFor(id), algorithm: "SHA1", digits: 6, period: 30 },
          }),
        }
      : undefined,
    tags: [{ id: `tag-${id}`, slug: "work", is_shared: true }],
    favorite: null,
    created: "2026-01-01T00:00:00+00:00",
    modified: "2026-01-02T00:00:00+00:00",
    deleted: false,
  };
}

// A Passbolt-shaped server behind client.request: the list embeds secrets only for
// contain[secret]=1 and honors filter[has-id][] by ID. Options let tests model
// reordered bulk responses, foreign secrets, or deployments that omit secrets.
function serve(client, rows, options = {}) {
  const {
    shuffleBulk = false,
    rejectBulk = false,
    bulkSecretFor = (row) => row.secret,
    singleSecretFor = (row) => row.secret,
  } = options;
  const stats = {
    listing: [],
    bulk: [],
    singles: [],
    bulkInFlight: 0,
    maxBulkInFlight: 0,
    bulkCallsAtFirstResult: undefined,
    bulkCalls: 0,
    singlesInFlight: 0,
    maxSinglesInFlight: 0,
  };
  client.request = async (url) => {
    const parsed = new URL(url, baseUrl);
    const respond = (body) => ({ ok: true, status: 200, json: async () => ({ header: { status: "success" }, body }) });
    if (parsed.pathname === "/resource-types.json") return respond(types);
    if (parsed.pathname === "/resources.json") {
      const ids = parsed.searchParams.getAll("filter[has-id][]");
      const wantsSecrets = parsed.searchParams.get("contain[secret]") === "1";
      if (!ids.length) {
        stats.listing.push(parsed.search);
        return respond(rows.map(({ secret, ...rest }) => rest));
      }
      stats.bulk.push(ids);
      stats.bulkCalls++;
      stats.bulkInFlight++;
      stats.maxBulkInFlight = Math.max(stats.maxBulkInFlight, stats.bulkInFlight);
      await new Promise((resolve) => setImmediate(resolve));
      stats.bulkInFlight--;
      if (rejectBulk) throw new Error("Batch filter unavailable");
      const selected = rows.filter((row) => ids.includes(row.id));
      const ordered = shuffleBulk ? [...selected].reverse() : selected;
      return respond(
        ordered.map((row) => {
          const { secret, ...rest } = row;
          const included = wantsSecrets ? bulkSecretFor(row) : undefined;
          return included ? { ...rest, secrets: [included] } : rest;
        }),
      );
    }
    const single = parsed.pathname.match(/^\/secrets\/resource\/([^/]+)\.json$/);
    if (single) {
      stats.singles.push(decodeURIComponent(single[1]));
      stats.singlesInFlight++;
      stats.maxSinglesInFlight = Math.max(stats.maxSinglesInFlight, stats.singlesInFlight);
      try {
        await new Promise((resolve) => setImmediate(resolve));
        const row = rows.find((candidate) => candidate.id === decodeURIComponent(single[1]));
        return respond(singleSecretFor(row));
      } finally {
        stats.singlesInFlight--;
      }
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  return stats;
}

function newClient() {
  const { PassboltClient } = loadTypeScript("src/lib/passbolt.ts", {
    "@raycast/api": {
      getPreferenceValues: () => ({ passboltUrl: baseUrl, privateKey: "/unused", passphrase: "unused" }),
    },
  });
  const client = new PassboltClient();
  client.authenticate = async () => {};
  client.readPrivateKey = async () => userKey;
  return client;
}

test("the Authenticator lists metadata only and downloads secrets just for TOTP candidates", async () => {
  // Interleaved server order: candidates and non-candidates alternate.
  const rows = [];
  for (let index = 0; index < 30; index++) {
    rows.push(await makeRow(`p${index}`, { typeId: "password-type" }));
    if (index < 25) rows.push(await makeRow(`t${index}`, { typeId: index === 7 ? "custom-schema" : "totp-type" }));
  }
  const candidateIds = rows.filter((row) => row.resource_type_id !== "password-type").map((row) => row.id);
  const client = newClient();
  // Bulk responses arrive in reverse order: entries must keep their own secrets anyway.
  const stats = serve(client, rows, { shuffleBulk: true });
  const updates = [];
  const result = await client.getTotpResources({ onProgress: (progress) => updates.push(progress) });

  assert.equal(result.totalResources, rows.length);
  assert.equal(result.candidates, candidateIds.length);
  assert.equal(stats.listing.length, 1);
  assert.ok(!stats.listing[0].includes("contain[secret]"), "the listing must not request secret payloads");
  assert.ok(!stats.listing[0].includes("filter[has-id]"), "the listing covers the whole vault");
  assert.deepEqual(stats.singles, [], "no per-entry secret requests on the happy path");
  const requestedIds = stats.bulk.flat();
  assert.deepEqual(
    [...requestedIds].sort(),
    [...candidateIds].sort(),
    "secret batches request exactly the TOTP candidates by ID",
  );
  assert.equal(new Set(requestedIds).size, requestedIds.length, "each candidate is requested once");
  assert.ok(stats.bulkCalls <= 1 + Math.ceil(candidateIds.length / 8), "secret requests stay bounded");
  assert.ok(stats.maxBulkInFlight <= 1, "at most one secret batch is in flight");

  assert.deepEqual(
    result.items.map((item) => item.id),
    candidateIds,
    "items keep the server order of their entries",
  );
  for (const item of result.items) {
    assert.equal(item.name, `Entry ${item.id}`);
    assert.equal(item.totp_error, undefined);
    assert.equal(item.metadata_error, undefined);
    const code = new TOTP({
      secret: item.totp.secretKey,
      algorithm: item.totp.algorithm,
      digits: item.totp.digits,
      period: item.totp.period,
    }).generate({ timestamp: FIXED_TIMESTAMP });
    assert.equal(code, expectedCode(item.id), `code for ${item.id} must come from its own secret`);
  }
  assert.ok(
    updates.some((progress) => progress.items.length > 0 && progress.processed < progress.candidates),
    "results appear before the entire load completes",
  );
});

test("bulk responses are matched by resource ID and foreign secrets are never shown", async () => {
  const rows = [await makeRow("alpha"), await makeRow("beta"), await makeRow("gamma")];
  const byId = new Map(rows.map((row) => [row.id, row]));

  // Every bulk row carries another entry's secret: matching by server order would
  // show one account's code under another account's name.
  const rotated = { alpha: "beta", beta: "gamma", gamma: "alpha" };
  const client = newClient();
  const stats = serve(client, rows, {
    bulkSecretFor: (row) => byId.get(rotated[row.id]).secret,
    singleSecretFor: (row) => row?.secret,
  });
  const result = await client.getTotpResources();
  assert.deepEqual(
    stats.singles.sort(),
    ["alpha", "beta", "gamma"],
    "foreign secrets fall back to the entry's own request",
  );
  for (const item of result.items) {
    assert.equal(item.totp_error, undefined);
    const code = new TOTP({ secret: item.totp.secretKey, digits: 6, period: 30 }).generate({
      timestamp: FIXED_TIMESTAMP,
    });
    assert.equal(code, expectedCode(item.id), `${item.id} must never display ${rotated[item.id]}'s code`);
  }

  // When even the fallback hands out a foreign secret, the entry reports an error
  // instead of displaying anything that could belong to another account.
  const strict = newClient();
  serve(strict, rows, {
    bulkSecretFor: (row) => byId.get(rotated[row.id]).secret,
    singleSecretFor: (row) => byId.get(rotated[row.id]).secret,
  });
  const failed = await strict.getTotpResources();
  assert.equal(failed.items.length, 3);
  for (const item of failed.items) {
    assert.equal(item.totp, undefined);
    assert.ok(item.totp_error);
  }
});

test("secret batches stream behind the first codes and a slow batch does not block them", async () => {
  const rows = await Promise.all(Array.from({ length: 60 }, (_, index) => makeRow(`stream-${index}`)));
  const client = newClient();
  const stats = serve(client, rows);
  const result = await client.getTotpResources({
    onProgress: (progress) => {
      if (stats.bulkCallsAtFirstResult === undefined && progress.items.length > 0) {
        stats.bulkCallsAtFirstResult = stats.bulkCalls;
      }
    },
  });
  assert.equal(result.items.length, 60);
  assert.ok(result.items.every((item) => item.totp));
  assert.ok(stats.bulkCalls > 1, "the vault needs several secret batches");
  assert.ok(
    stats.bulkCallsAtFirstResult < stats.bulkCalls,
    "the first codes appear while later secret batches are still outstanding",
  );
  assert.equal(stats.maxBulkInFlight, 1);
  assert.deepEqual(stats.singles, []);
});

test("a broken or missing secret is reported per entry without hiding the others", async () => {
  const rows = [
    await makeRow("good"),
    {
      ...(await makeRow("corrupt")),
      secret: { id: "s", user_id: "user-1", resource_id: "corrupt", data: "not a message" },
    },
    await makeRow("missing", { secret: false }),
  ];
  const client = newClient();
  const stats = serve(client, rows);
  const result = await client.getTotpResources();
  assert.deepEqual(
    result.items.map((item) => item.id),
    ["good", "corrupt", "missing"],
    "failed entries stay visible in their place",
  );
  assert.ok(result.items[0].totp && !result.items[0].totp_error);
  for (const item of [result.items[1], result.items[2]]) {
    assert.equal(item.totp, undefined);
    assert.equal(item.totp_error, "Unable to read this TOTP entry. Check that it opens in Passbolt.");
  }
  assert.deepEqual(stats.singles, ["missing"], "only the entry without a bulk secret falls back to its own request");
});

test("missing or rejected bulk secrets use bounded fallbacks and retry batches on refresh", async () => {
  const rows = await Promise.all(Array.from({ length: 90 }, (_, index) => makeRow(`fallback-${index}`)));
  for (const rejectBulk of [false, true]) {
    const client = newClient();
    const stats = serve(client, rows, { rejectBulk, bulkSecretFor: () => undefined });
    const result = await client.getTotpResources();
    assert.equal(result.items.length, rows.length);
    assert.ok(result.items.every((item) => item.totp && !item.totp_error));
    assert.equal(stats.singles.length, rows.length);
    assert.ok(stats.maxSinglesInFlight <= 8, `fallback concurrency was ${stats.maxSinglesInFlight}`);
    assert.equal(stats.bulkCalls, 1, "an unavailable batch path is probed only once per load");

    const refreshed = serve(client, rows);
    const recovered = await client.getTotpResources();
    assert.equal(recovered.items.length, rows.length);
    assert.ok(refreshed.bulkCalls > 0, "Refresh retries batching after the server recovers");
    assert.deepEqual(refreshed.singles, []);
  }
});

test("one slow secret does not delay another entry's first usable code", async () => {
  const rows = [await makeRow("slow"), await makeRow("ready")];
  const client = newClient();
  serve(client, rows);
  let releaseSlow;
  const held = new Promise((resolve) => (releaseSlow = resolve));
  const decrypt = client.decryptSecretData.bind(client);
  client.decryptSecretData = async (data) => {
    if (data === rows[0].secret.data) await held;
    return decrypt(data);
  };
  const updates = [];
  try {
    const result = await client.getTotpResources({
      onProgress: (progress) => {
        updates.push(progress);
        if (progress.items.some((item) => item.id === "ready" && item.totp)) releaseSlow();
      },
    });
    assert.deepEqual(
      updates.find((update) => update.items.length)?.items.map((item) => item.id),
      ["ready"],
    );
    assert.deepEqual(
      result.items.map((item) => item.id),
      ["slow", "ready"],
    );
  } finally {
    releaseSlow();
  }
});

test("the first usable code is emitted even when an error row appeared first", async () => {
  const rows = [await makeRow("broken"), await makeRow("usable"), await makeRow("last")];
  const client = newClient();
  serve(client, rows);
  let releaseUsable, releaseLast;
  const heldUsable = new Promise((resolve) => (releaseUsable = resolve));
  const heldLast = new Promise((resolve) => (releaseLast = resolve));
  const decrypt = client.decryptSecretData.bind(client);
  client.decryptSecretData = async (data) => {
    if (data === rows[0].secret.data) throw new Error("Corrupt entry");
    await (data === rows[1].secret.data ? heldUsable : heldLast);
    return decrypt(data);
  };
  let sawError = false,
    sawCode = false;
  await client.getTotpResources({
    onProgress: (progress) => {
      if (progress.items.some((item) => item.totp_error)) {
        sawError = true;
        releaseUsable();
      }
      if (progress.items.some((item) => item.id === "usable" && item.totp)) {
        sawCode = true;
        releaseLast();
      }
    },
  });
  assert.ok(sawError && sawCode);
});

test("cancelling during the secret batches stops later batches and surfaces no unhandled rejections", async () => {
  const rows = await Promise.all(Array.from({ length: 60 }, (_, index) => makeRow(`cancel-${index}`)));
  const client = newClient();
  const stats = serve(client, rows);
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on("unhandledRejection", onUnhandled);
  try {
    const controller = new AbortController();
    await assert.rejects(
      client.getTotpResources({
        signal: controller.signal,
        onProgress: (progress) => {
          if (progress.items.length > 0) controller.abort();
        },
      }),
      /abort/i,
    );
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.deepEqual(unhandled, [], "cancelled entries must not surface as unhandled rejections");
    assert.ok(stats.bulkCalls < 3, "the last secret batch is never requested after cancellation");
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
  const refreshed = await client.getTotpResources();
  assert.equal(refreshed.items.length, 60);
});

test("cancelling search stops the remaining metadata work and a later load recovers", async () => {
  const rows = await Promise.all(Array.from({ length: 20 }, (_, index) => makeRow(`search-${index}`)));
  const client = newClient();
  serve(client, rows);
  const decryptor = client.metadataDecryptor;
  const decryptResource = decryptor.decryptResource.bind(decryptor);
  let decrypted = 0;
  decryptor.decryptResource = async (resource) => {
    decrypted++;
    return decryptResource(resource);
  };
  const controller = new AbortController();
  await assert.rejects(
    client.searchResources("", {
      signal: controller.signal,
      onProgress: (progress) => {
        if (progress.processed > 0) controller.abort();
      },
    }),
    /abort/i,
  );
  assert.ok(decrypted < 20, "cancellation stops the entries still waiting to decrypt");
  // Closing and reopening the command must load everything again.
  const recovered = await client.searchResources("");
  assert.equal(recovered.body.length, 20);
  assert.ok(recovered.body.every((item) => item.name.startsWith("Entry ")));
  assert.ok(
    recovered.body.some((item) => (item.uris ?? []).some((uri) => uri.includes("secondary-search-0"))),
    "secondary URLs stay searchable",
  );
  assert.equal((await client.searchResources("search-0 example.test secondary-search-0")).body.length, 1);
});

test("cancellation during the final decrypt prevents late progress and successful completion", async () => {
  for (const command of ["searchResources", "getTotpResources"]) {
    const client = newClient();
    serve(client, [await makeRow("final")]);
    let release, notifyStarted;
    const started = new Promise((resolve) => (notifyStarted = resolve));
    const held = new Promise((resolve) => (release = resolve));
    const decryptor = client.metadataDecryptor;
    const decrypt = decryptor.decryptResource.bind(decryptor);
    decryptor.decryptResource = async (resource) => {
      notifyStarted();
      await held;
      return decrypt(resource);
    };
    const controller = new AbortController();
    const updates = [];
    const options = { signal: controller.signal, onProgress: (progress) => updates.push(progress) };
    const load = command === "searchResources" ? client.searchResources("", options) : client.getTotpResources(options);
    await started;
    const updatesBeforeAbort = updates.length;
    controller.abort();
    release();
    await assert.rejects(load, /abort/i);
    assert.equal(updates.length, updatesBeforeAbort, "in-flight crypto must not publish after cancellation");
  }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Throttled progress updates are dropped inside the 150 ms window, so a trailing
// update must be scheduled: ready entries must not stay hidden behind a slow one.
test("a throttled update is delivered later instead of hiding ready Authenticator entries", async () => {
  const rows = await Promise.all([
    ...Array.from({ length: 4 }, (_, index) => makeRow(`trail-${index}`)),
    makeRow("trail-slow"),
  ]);
  const client = newClient();
  serve(client, rows);
  const decryptor = client.metadataDecryptor;
  const decryptResource = decryptor.decryptResource.bind(decryptor);
  let releaseSlow;
  const held = new Promise((resolve) => (releaseSlow = resolve));
  decryptor.decryptResource = async (resource, signal) => {
    if (resource.id === "trail-slow") await held;
    return decryptResource(resource, signal);
  };
  const updates = [];
  const load = client.getTotpResources({
    onProgress: (progress) => updates.push({ ...progress, items: [...progress.items] }),
  });
  // Only the four quick entries can finish while the slow one is held: any update
  // that shows them must come from the scheduled trailing snapshot, not from a
  // further completion.
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline && !updates.some((update) => update.processed === 4)) await sleep(25);
  const trailing = updates.find((update) => update.processed === 4);
  assert.ok(trailing, "a throttled update is delivered later instead of dropped");
  assert.equal(trailing.items.length, 4);
  assert.ok(trailing.processed < trailing.candidates);
  releaseSlow();
  const result = await load;
  assert.equal(result.items.length, 5);
});

test("a throttled update is delivered later instead of hiding ready search entries", async () => {
  const rows = await Promise.all([
    ...Array.from({ length: 4 }, (_, index) => makeRow(`trail-search-${index}`)),
    makeRow("trail-search-slow"),
  ]);
  const client = newClient();
  serve(client, rows);
  const decryptor = client.metadataDecryptor;
  const decryptResource = decryptor.decryptResource.bind(decryptor);
  let releaseSlow;
  const held = new Promise((resolve) => (releaseSlow = resolve));
  decryptor.decryptResource = async (resource, signal) => {
    if (resource.id === "trail-search-slow") await held;
    return decryptResource(resource, signal);
  };
  const updates = [];
  const load = client.searchResources("", {
    onProgress: (progress) => updates.push({ ...progress, items: [...progress.items] }),
  });
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline && !updates.some((update) => update.processed === 4)) await sleep(25);
  const trailing = updates.find((update) => update.processed === 4);
  assert.ok(trailing, "a throttled update is delivered later instead of dropped");
  assert.equal(trailing.items.length, 4);
  releaseSlow();
  const result = await load;
  assert.equal(result.body.length, 5);
});

// Cancelling while an entry waits for its metadata key must stop before more
// crypto starts, instead of decrypting the entry and discarding the result.
test("metadata decryption stops at the key wait when its load is cancelled", async () => {
  const rows = [await makeRow("keywait")];
  const client = newClient();
  serve(client, rows);
  const decryptor = client.metadataDecryptor;
  let releaseKey;
  const held = new Promise((resolve) => (releaseKey = resolve));
  const readPrivateKey = client.readPrivateKey.bind(client);
  let notifyStarted;
  const started = new Promise((resolve) => (notifyStarted = resolve));
  client.readPrivateKey = async () => {
    notifyStarted();
    await held;
    return readPrivateKey();
  };
  const controller = new AbortController();
  const load = decryptor.decryptResource(rows[0], controller.signal);
  await started;
  controller.abort();
  releaseKey();
  await assert.rejects(load, /abort/i, "cancellation during the key wait must reject instead of decrypting");
});
