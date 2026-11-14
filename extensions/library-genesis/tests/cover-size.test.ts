import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

import { MAX_COVER_BYTES, getCachedBookCover, getCachedFullSizeBookCover } from "../src/utils/api/covers";

let directory: string;
const image = Buffer.from("/9j/2Q==", "base64");
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "libgen-cover-size-"));
  await mkdir(join(directory, "covers"));
});
after(async () => {
  await rm(directory, { recursive: true, force: true });
});
const url = (name: string) => `https://libgen.li/covers/${name}.jpg`;
const response = (body: BodyInit, headers: Record<string, string> = {}) =>
  new Response(body, { headers: { "Content-Type": "image/jpeg", ...headers } });

test("oversized Content-Length rejects before reading and cancels the body without caching", async (context) => {
  let reads = 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        reads++;
        controller.enqueue(image);
      },
      cancel() {
        cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );
  context.mock.method(globalThis, "fetch", async () =>
    response(body, { "Content-Length": String(MAX_COVER_BYTES + 1) }),
  );
  const before = await readdir(join(directory, "covers"));
  await assert.rejects(getCachedBookCover(url("declared-large"), directory), /5 MiB size limit/);
  assert.equal(reads, 0);
  assert.equal(cancelled, true);
  assert.deepEqual(await readdir(join(directory, "covers")), before);
});

test("streamed limits stop chunked and compressed responses even with absent or misleading lengths", async (context) => {
  let headers: Record<string, string> = {};
  let reads = 0;
  let cancelled = false;
  context.mock.method(globalThis, "fetch", async () => {
    reads = 0;
    cancelled = false;
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          reads++;
          if (reads === 1) controller.enqueue(new Uint8Array(MAX_COVER_BYTES));
          else controller.enqueue(new Uint8Array(1));
        },
        cancel() {
          cancelled = true;
        },
      },
      { highWaterMark: 0 },
    );
    return response(body, headers);
  });
  const before = await readdir(join(directory, "covers"));
  for (const [i, advertised] of [
    {},
    { "Content-Length": "1" },
    { "Content-Length": "128", "Content-Encoding": "gzip" },
  ].entries()) {
    headers = advertised;
    await assert.rejects(getCachedBookCover(url(`stream-large-${i}`), directory), /5 MiB size limit/);
    assert.equal(reads, 2, "do not consume the rest of an oversized stream");
    assert.equal(cancelled, true);
    assert.deepEqual(await readdir(join(directory, "covers")), before);
  }
});

test("a cover exactly at the size limit is cached with every byte intact", async (context) => {
  const data = Buffer.alloc(MAX_COVER_BYTES, 42);
  context.mock.method(globalThis, "fetch", async () => response(data, { "Content-Length": String(data.length) }));
  const path = await getCachedBookCover(url("boundary"), directory);
  assert.equal((await stat(path)).size, MAX_COVER_BYTES);
  assert.deepEqual(await readFile(path), data);
});

test("many tiny chunks preserve data without accumulating a buffer per chunk", async (context) => {
  const data = Buffer.alloc(10000, 42);
  let index = 0;
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (index === data.length) controller.close();
        else controller.enqueue(data.subarray(index++, index));
      },
    },
    { highWaterMark: 0 },
  );
  context.mock.method(globalThis, "fetch", async () => response(body));
  const path = await getCachedBookCover(url("tiny-chunks"), directory);
  assert.deepEqual(await readFile(path), data);
});

test("oversized full-resolution covers fall back to a thumbnail subject to the same limit", async (context) => {
  const requests: string[] = [];
  context.mock.method(globalThis, "fetch", async (input: URL) => {
    requests.push(input.pathname);
    if (input.pathname.endsWith("_small.jpg")) return response(image);
    return response(image, { "Content-Length": String(MAX_COVER_BYTES + 1) });
  });
  const path = await getCachedFullSizeBookCover(url("fallback_small"), directory);
  assert.deepEqual(await readFile(path), image);
  assert.deepEqual(requests, ["/covers/fallback.jpg", "/covers/fallback_small.jpg"]);
});

test("oversized thumbnails are also rejected and never cached", async (context) => {
  context.mock.method(globalThis, "fetch", async () =>
    response(image, { "Content-Length": String(MAX_COVER_BYTES + 1) }),
  );
  const before = await readdir(join(directory, "covers"));
  await assert.rejects(getCachedFullSizeBookCover(url("both-large_small"), directory), /5 MiB size limit/);
  assert.deepEqual(await readdir(join(directory, "covers")), before);
});

test("oversized files from an older cache are removed and replaced with a bounded cover", async (context) => {
  const coverUrl = url("old-large");
  const expectedPath = join(directory, "covers", `${createHash("sha256").update(coverUrl).digest("hex")}.jpg`);
  await writeFile(expectedPath, Buffer.alloc(MAX_COVER_BYTES + 1));
  let requests = 0;
  context.mock.method(globalThis, "fetch", async () => {
    requests++;
    return response(image);
  });
  assert.equal(await getCachedBookCover(coverUrl, directory), expectedPath);
  assert.equal(requests, 1);
  assert.deepEqual(await readFile(expectedPath), image);
  assert.equal(await getCachedBookCover(coverUrl, directory), expectedPath);
  assert.equal(requests, 1);
});

test("oversized cached covers do not survive a rejected replacement download", async (context) => {
  const coverUrl = url("old-large-rejected");
  const path = join(directory, "covers", `${createHash("sha256").update(coverUrl).digest("hex")}.jpg`);
  await writeFile(path, Buffer.alloc(MAX_COVER_BYTES + 1));
  context.mock.method(globalThis, "fetch", async () =>
    response(image, { "Content-Length": String(MAX_COVER_BYTES + 1) }),
  );
  await assert.rejects(getCachedBookCover(coverUrl, directory), /5 MiB size limit/);
  await assert.rejects(stat(path), { code: "ENOENT" });
  assert.ok(!(await readdir(join(directory, "covers"))).some((name) => name.endsWith(".tmp")));
});
