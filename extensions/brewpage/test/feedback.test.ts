import assert from "node:assert/strict";
import { mkdtemp, open, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createPublisher, MAX_BYTES, readSelectedFile } from "../src/client";

const report = { content: "# Selected report", format: "markdown" as const };
const fixture = {
  id: "AbCd123456",
  namespace: "public",
  link: "https://brewpage.app/public/AbCd123456",
  expiresAt: "2026-11-01T00:00:00.000Z",
  ownerToken: "fixture-owner-capability",
  ownerLink: "https://brewpage.app/api/html/public/AbCd123456",
};

test("unsupported header passwords fail before confirmation or transport", async () => {
  // GIVEN password characters or edge spaces that cannot round-trip unchanged through this client.
  for (const password of [
    "\u{1f512}",
    "\u043f\u0430\u0440\u043e\u043b\u044c",
    "\u0100",
    " padded",
    "padded ",
    "bad\u0000value",
    "bad\tvalue",
  ]) {
    const calls = { confirm: 0, transport: 0, storage: 0 };
    assert.deepEqual(calls, { confirm: 0, transport: 0, storage: 0 }, "Each scenario begins without side effects");
    const publisher = createPublisher(async (_url, init) => {
      calls.transport++;
      new Headers(init?.headers);
      return new Response(JSON.stringify(fixture), { status: 201 });
    });
    // WHEN publishing would otherwise confirm and serialize the password header.
    await assert.rejects(
      publisher(
        report,
        { visibility: "public", protection: "password", password },
        {
          confirm: async () => {
            calls.confirm++;
            return true;
          },
          saveOwner: async () => {
            calls.storage++;
          },
        },
      ),
      {
        message:
          "This password cannot be sent unchanged. Remove unsupported characters or leading/trailing whitespace.",
      },
      "Unsupported password inputs receive a fixed, credential-free validation error",
    );
    // THEN no consent dialog, request or credential write has occurred.
    assert.deepEqual(calls, { confirm: 0, transport: 0, storage: 0 }, "Validation precedes every side effect");
  }
});

test("selected files survive repeated short reads and reject growth beyond the bound", async (context) => {
  // GIVEN a real UTF-8 file whose descriptor returns short chunks, including inside a character.
  const directory = await realpath(await mkdtemp(path.join(tmpdir(), "brewpage-short-read-")));
  const filename = path.join(directory, "report.md");
  const content = "# Report\n\nText \u20ac and complete ending.\n";
  await writeFile(filename, content);
  const handle = await open(filename, "r");
  const prototype = Object.getPrototypeOf(handle);
  const original = prototype.read;
  assert.equal((await handle.stat()).size, Buffer.byteLength(content), "The fixture contains the full UTF-8 report");
  try {
    for (const chunkSize of [1, 3, 7]) {
      context.mock.method(
        prototype,
        "read",
        function (this: typeof handle, buffer: Buffer, offset: number, length: number, position: number) {
          return original.call(this, buffer, offset, Math.min(length, chunkSize), position);
        },
      );
      // WHEN the selected descriptor reads less than requested before EOF.
      const actual = await readSelectedFile(filename);
      // THEN decoding happens after the complete bounded byte stream is read.
      assert.deepEqual(actual, { content, format: "markdown" }, "Short reads preserve the entire UTF-8 report");
      context.mock.restoreAll();
    }
    const originalStat = prototype.stat;
    context.mock.method(prototype, "stat", async function (this: typeof handle) {
      const metadata = await originalStat.call(this);
      await writeFile(filename, Buffer.alloc(MAX_BYTES + 1, 120));
      return metadata;
    });
    await assert.rejects(
      readSelectedFile(filename),
      { message: "Report exceeds the 2 MiB client limit." },
      "The extra-byte sentinel rejects growth after the initial descriptor stat",
    );
  } finally {
    context.mock.restoreAll();
    await handle.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("failed owner storage retains the reader result and retries only private storage", async () => {
  // GIVEN successful publication followed by two storage failures and then a successful save.
  const calls = { transport: 0, storage: 0 };
  const saved: unknown[] = [];
  const unavailable = () => {
    throw new Error(fixture.ownerToken);
  };
  const outcomes = [
    unavailable,
    unavailable,
    (key: string, owner: unknown) => {
      saved.push({ key, owner });
    },
  ];
  const publisher = createPublisher(async () => {
    calls.transport++;
    return new Response(JSON.stringify(fixture), { status: 201 });
  });
  assert.deepEqual(calls, { transport: 0, storage: 0 }, "The publication and storage boundary begin idle");
  // WHEN the first private credential write fails after the publication already exists.
  const publication = await publisher(
    report,
    { visibility: "public", protection: "none" },
    {
      confirm: async () => true,
      saveOwner: async (key, owner) => {
        outcomes[calls.storage++](key, owner);
      },
    },
  );
  // THEN reader data is available while capabilities stay inside the memory-only retry closure.
  assert.equal(typeof publication?.retryOwnerStorage, "function", "A storage-only recovery action is retained");
  assert.equal(
    JSON.stringify(publication),
    JSON.stringify({
      link: fixture.link,
      expiresAt: fixture.expiresAt,
      id: fixture.id,
      namespace: fixture.namespace,
    }),
    "Reader serialization never contains owner credentials",
  );
  await assert.rejects(
    publication!.retryOwnerStorage!(),
    {
      message: "Owner access could not be saved. Keep this window open and retry saving.",
    },
    "A failed storage retry keeps a fixed, credential-free warning",
  );
  await publication!.retryOwnerStorage!();
  assert.deepEqual(
    { calls, saved },
    {
      calls: { transport: 1, storage: 3 },
      saved: [
        {
          key: "publication:public:AbCd123456",
          owner: { ownerToken: fixture.ownerToken, ownerLink: fixture.ownerLink },
        },
      ],
    },
    "Recovery retries the existing capability write without publishing again",
  );
});
