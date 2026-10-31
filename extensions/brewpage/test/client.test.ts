import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, realpath, rm, writeFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createPublisher, readSelectedFile, readerLink, validateChoices } from "../src/client";

const report = { content: "# A deliberately selected report", format: "markdown" as const };
const fixture = {
  id: "AbCd123456",
  namespace: "public",
  link: "https://brewpage.app/public/AbCd123456",
  expiresAt: "2026-11-01T00:00:00.000Z",
  ownerToken: "SECRET_OWNER_TOKEN",
  ownerLink: "https://brewpage.app/api/html/public/AbCd123456",
  manageUrl: "https://brewpage.app/manage/SECRET_MANAGE",
};

test("HTTP protocol: explicit visibility/password matrix preserves private credentials only in owner storage", async () => {
  // GIVEN a loopback-only fixture and all explicit privacy combinations.
  const received: unknown[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    received.push({
      method: request.method,
      url: request.url,
      password: request.headers["x-password"] ?? null,
      body: JSON.parse(Buffer.concat(chunks).toString()),
    });
    response.writeHead(201, { "Content-Type": "application/json" });
    response.end(JSON.stringify(fixture));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const publisher = createPublisher(fetch, `http://127.0.0.1:${address.port}`);
  const saved: unknown[] = [];
  try {
    for (const visibility of ["public", "unlisted"]) {
      for (const [protection, password] of [
        ["none", ""],
        ["password", "READER_PASSWORD"],
        ["password", "caf\u00e9"],
      ]) {
        // WHEN the user confirms the selected choices.
        const result = await publisher(
          report,
          { visibility, protection, password },
          {
            confirm: async () => true,
            saveOwner: async (key, owner) => {
              saved.push({ key, owner });
            },
          },
        );
        // THEN returned UI data contains no owner credentials.
        assert.deepEqual(
          result,
          { link: fixture.link, expiresAt: fixture.expiresAt, id: fixture.id, namespace: fixture.namespace },
          "Only reader-safe publication data reaches the UI",
        );
      }
    }
    assert.deepEqual(
      received,
      [
        { method: "POST", url: "/api/html?ns=public&ttl=15", password: null, body: report },
        { method: "POST", url: "/api/html?ns=public&ttl=15", password: "READER_PASSWORD", body: report },
        { method: "POST", url: "/api/html?ns=public&ttl=15", password: "caf\u00e9", body: report },
        { method: "POST", url: "/api/html?ttl=15", password: null, body: report },
        { method: "POST", url: "/api/html?ttl=15", password: "READER_PASSWORD", body: report },
        { method: "POST", url: "/api/html?ttl=15", password: "caf\u00e9", body: report },
      ],
      "HTTP query, JSON, and password header exactly match OpenAPI 2.6",
    );
    assert.deepEqual(
      saved,
      Array(6).fill({
        key: "publication:public:AbCd123456",
        owner: { ownerToken: fixture.ownerToken, ownerLink: fixture.ownerLink, manageUrl: fixture.manageUrl },
      }),
      "All owner capabilities are retained solely through the private storage boundary",
    );
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("merged HTTP 200 preserves existing owner credentials and original expiry independently of reader access", async () => {
  // GIVEN existing or empty private storage and explicit server ownership decisions.
  const key = "publication:public:AbCd123456";
  const originalOwner = { ownerToken: "VALID_EXISTING_TOKEN", ownerLink: fixture.ownerLink };
  for (const scenario of [
    { existing: true, isOwner: false, access: "public" },
    { existing: false, isOwner: false, access: "protected" },
    { existing: true, isOwner: true, access: "public" },
  ]) {
    const stored = new Map(scenario.existing ? [[key, originalOwner]] : []);
    const writes: unknown[] = [];
    const response = {
      ...fixture,
      expiresAt: "2026-10-28T00:00:00.000Z",
      access: scenario.access,
      result: { code: "duplicate", action: "merged", extras: { isOwner: scenario.isOwner } },
    };
    const publisher = createPublisher(async () => new Response(JSON.stringify(response), { status: 200 }));
    // WHEN an anonymous publication returns an existing resource and a fresh requester token.
    const publication = await publisher(
      report,
      { visibility: "public", protection: "none" },
      {
        confirm: async () => true,
        saveOwner: async (storageKey, owner) => {
          writes.push(storageKey);
          stored.set(storageKey, owner);
        },
      },
    );
    // THEN only an owned result replaces credentials; reader data retains the original expiry.
    assert.deepEqual(
      { publication, stored: [...stored], writes },
      {
        publication: {
          link: fixture.link,
          expiresAt: response.expiresAt,
          id: fixture.id,
          namespace: fixture.namespace,
        },
        stored: scenario.isOwner
          ? [[key, { ownerToken: fixture.ownerToken, ownerLink: fixture.ownerLink, manageUrl: fixture.manageUrl }]]
          : scenario.existing
            ? [[key, originalOwner]]
            : [],
        writes: scenario.isOwner ? [key] : [],
      },
      `Explicit isOwner=${scenario.isOwner} governs private writes with existing=${scenario.existing}, access=${scenario.access}`,
    );
  }
});

test("expiry projection rejects Markdown suffixes, date overflow and malformed timestamps before private storage", async () => {
  // GIVEN untrusted server expiry fields and a storage-write sentinel.
  let writes = 0;
  const options = {
    confirm: async () => true,
    saveOwner: async () => {
      writes++;
    },
  };
  for (const expiresAt of [
    "2026-11-01 (![](https://evil.invalid/FAKE_OWNER_SECRET))",
    "2026-02-30T00:00:00Z",
    "2026-11-01T25:00:00Z",
    "not-a-date-FAKE_OWNER_SECRET",
  ]) {
    const publisher = createPublisher(async () => new Response(JSON.stringify({ ...fixture, expiresAt })));
    // WHEN an invalid expiry would otherwise reach Detail Markdown.
    // THEN a fixed redacted error is returned and no capability is written.
    await assert.rejects(
      publisher(report, { visibility: "public", protection: "none" }, options),
      { message: "Invalid expiry in BrewPage response." },
      "Unsafe expiry never reaches the UI or error message",
    );
  }
  assert.equal(writes, 0, "Malformed expiry responses never change owner storage");
  const publisher = createPublisher(
    async () => new Response(JSON.stringify({ ...fixture, expiresAt: "2026-11-01T00:00:00.123456Z" })),
  );
  assert.deepEqual(
    await publisher(report, { visibility: "public", protection: "none" }, options),
    { link: fixture.link, expiresAt: "2026-11-01T00:00:00.123Z", id: fixture.id, namespace: fixture.namespace },
    "Valid server timestamps are projected into canonical ISO strings only",
  );
});

test("privacy: cancel and invalid choices make zero network/storage calls; errors never echo server secrets", async () => {
  // GIVEN a fetch sentinel and encrypted-storage sentinel.
  let calls = 0;
  const publisher = createPublisher(async () => {
    calls++;
    throw new Error("SECRET");
  });
  const options = {
    confirm: async () => false,
    saveOwner: async () => {
      calls++;
    },
  };
  // WHEN the user cancels or leaves either privacy choice blank.
  assert.equal(
    await publisher(report, { visibility: "unlisted", protection: "none" }, options),
    undefined,
    "Cancellation returns no publication",
  );
  for (const choices of [
    { visibility: "", protection: "none" },
    { visibility: "public", protection: "" },
    { visibility: "unlisted", protection: "password" },
  ]) {
    assert.throws(() => validateChoices(choices), Error, "Every missing explicit privacy choice is rejected");
  }
  // THEN neither cancellation nor validation makes requests or writes credentials.
  assert.equal(calls, 0, "No network or storage call occurs before confirmation");
  const refused = createPublisher(
    async () =>
      new Response(JSON.stringify({ message: fixture.ownerToken, manageUrl: fixture.manageUrl }), { status: 429 }),
  );
  await assert.rejects(
    refused(report, { visibility: "public", protection: "none" }, { ...options, confirm: async () => true }),
    { message: "BrewPage refused publication (HTTP 429). No automatic retry was made." },
    "Error response bodies cannot leak credentials into UI",
  );
  await assert.rejects(
    publisher(report, { visibility: "public", protection: "none" }, { ...options, confirm: async () => true }),
    { message: "Connection failed. Publication may have succeeded; check before trying again." },
    "Transport errors are redacted",
  );
});

test("selected files: only bounded UTF-8 regular HTML/Markdown files are read; secrets and symlinks refused", async () => {
  // GIVEN explicit local fixtures, never workspace scanning.
  const directory = await realpath(await mkdtemp(path.join(tmpdir(), "brewpage-files-")));
  try {
    await writeFile(path.join(directory, "report.md"), report.content);
    await symlink(path.join(directory, "report.md"), path.join(directory, "linked.md"));
    // WHEN the user selects one report.
    assert.deepEqual(
      await readSelectedFile(path.join(directory, "report.md")),
      report,
      "Markdown content and format are read exactly",
    );
    // THEN disallowed selections fail before publication.
    for (const name of [
      ".env",
      ".env.md",
      "secrets.md",
      "credentials.html",
      "api-token.md",
      "private-key.html",
      "linked.md",
      "code.ts",
    ]) {
      await assert.rejects(readSelectedFile(path.join(directory, name)), Error, `${name} is refused`);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("reader URL allowlist rejects reserved hosts and unsafe links before UI or owner storage", async () => {
  // GIVEN untrusted response links.
  for (const link of [
    "http://brewpage.app/public/AbCd123456",
    "https://evil.test/public/AbCd123456",
    `${fixture.link}?ownerToken=SECRET`,
    `${fixture.link}#SECRET`,
    fixture.manageUrl,
    "https://user:password@brewpage.app/public/AbCd123456",
  ]) {
    // WHEN validating links before copy/open.
    // THEN unsafe values never enter reader UI.
    assert.throws(() => readerLink(link), Error, "Unsafe response links are rejected");
  }
  assert.equal(readerLink(fixture.link), fixture.link, "The documented reader link is accepted");
  let writes = 0;
  for (const label of [
    "unlock",
    "www",
    "api",
    "admin",
    "assets",
    "static",
    "cdn",
    "status",
    "health",
    "metrics",
    "grafana",
    "prometheus",
    "monitoring",
    "autoconfig",
    "autodiscover",
    "fe-bounces",
    "account",
  ]) {
    const link = `https://${label}.brewpage.app/`;
    assert.throws(
      () => readerLink(link),
      { message: "BrewPage returned an unsafe reader link." },
      `${label} is reserved`,
    );
    const publisher = createPublisher(async () => new Response(JSON.stringify({ ...fixture, link })));
    await assert.rejects(
      publisher(
        report,
        { visibility: "public", protection: "none" },
        {
          confirm: async () => true,
          saveOwner: async () => {
            writes++;
          },
        },
      ),
      { message: "BrewPage returned an unsafe reader link." },
      `${label} never reaches publication output`,
    );
  }
  assert.equal(writes, 0, "Reserved reader hosts cause no private storage writes");
  assert.equal(
    readerLink("https://abc1234567.brewpage.app/"),
    "https://abc1234567.brewpage.app/",
    "Generated bare UID reader hosts remain valid",
  );
  assert.equal(
    readerLink("https://private-abc1234567.brewpage.app/"),
    "https://private-abc1234567.brewpage.app/",
    "Native subdomain reader links are accepted",
  );
});
