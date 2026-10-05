import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, truncate, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";

import {
  COVER_CACHE_MAX_AGE_MS,
  MAX_CACHED_COVERS,
  MAX_COVER_BYTES,
  MAX_COVER_CACHE_BYTES,
} from "../src/utils/api/cover-cache";
import { getCachedBookCover } from "../src/utils/api/covers";

const image = Buffer.from("/9j/2Q==", "base64");
const url = (name: string) => `https://libgen.li/covers/${name}.jpg`;
const filename = (name: string) => `${createHash("sha256").update(url(name)).digest("hex")}.jpg`;
const fixture = async (context: TestContext) => {
  const directory = await mkdtemp(join(tmpdir(), "libgen-cover-cache-"));
  const cache = join(directory, "covers");
  await mkdir(cache);
  context.after(() => rm(directory, { recursive: true, force: true }));
  let requests = 0;
  context.mock.method(globalThis, "fetch", async () => {
    requests++;
    return new Response(image, { headers: { "Content-Type": "image/jpeg" } });
  });
  const seed = async (name: string, size = image.length, age = 1000) => {
    const path = join(cache, filename(name));
    await writeFile(path, image);
    await truncate(path, size);
    const date = new Date(Date.now() - age);
    await utimes(path, date, date);
    return path;
  };
  const entries = async () => {
    const names = (await readdir(cache)).filter((name) => /^[a-f0-9]{64}\.jpg$/.test(name));
    const sizes = await Promise.all(names.map(async (name) => (await stat(join(cache, name))).size));
    return { count: names.length, bytes: sizes.reduce((total, size) => total + size, 0) };
  };
  return { directory, cache, seed, entries, requests: () => requests };
};

test("a new cover evicts the least recently used image before exceeding the byte budget", async (context) => {
  const { directory, seed, entries } = await fixture(context);
  const oldest = await seed("oldest", MAX_COVER_BYTES, 100000);
  const newer = await seed("newer", MAX_COVER_BYTES, 50000);
  for (let i = 2; i < MAX_COVER_CACHE_BYTES / MAX_COVER_BYTES; i++) await seed(`large-${i}`, MAX_COVER_BYTES);
  const path = await getCachedBookCover(url("new"), directory);
  await assert.rejects(stat(oldest), { code: "ENOENT" });
  assert.equal((await stat(newer)).size, MAX_COVER_BYTES);
  assert.deepEqual(await readFile(path), image);
  assert.ok((await entries()).bytes <= MAX_COVER_CACHE_BYTES);
});

test("accessing a cached cover refreshes its recency without another download", async (context) => {
  const { directory, seed, requests } = await fixture(context);
  const reused = await seed("reused", MAX_COVER_BYTES, 100000);
  const oldestUnused = await seed("unused", MAX_COVER_BYTES, 50000);
  for (let i = 2; i < MAX_COVER_CACHE_BYTES / MAX_COVER_BYTES; i++) await seed(`large-${i}`, MAX_COVER_BYTES);
  assert.equal(await getCachedBookCover(url("reused"), directory), reused);
  assert.equal(requests(), 0);
  await getCachedBookCover(url("new"), directory);
  assert.equal((await stat(reused)).size, MAX_COVER_BYTES);
  await assert.rejects(stat(oldestUnused), { code: "ENOENT" });
});

test("many small covers respect the file count limit", async (context) => {
  const { directory, seed, entries } = await fixture(context);
  const oldest = await seed("oldest", image.length, 100000);
  for (let i = 1; i < MAX_CACHED_COVERS; i++) await seed(`tiny-${i}`);
  await getCachedBookCover(url("new"), directory);
  assert.equal((await entries()).count, MAX_CACHED_COVERS);
  await assert.rejects(stat(oldest), { code: "ENOENT" });
});

test("the first cache access trims an oversized old cache even when the requested cover is already saved", async (context) => {
  const { directory, seed, entries, requests } = await fixture(context);
  const oldest = await seed("oldest", MAX_COVER_BYTES, 100000);
  for (let i = 1; i <= MAX_COVER_CACHE_BYTES / MAX_COVER_BYTES; i++) await seed(`large-${i}`, MAX_COVER_BYTES);
  const reused = await seed("reused");
  assert.equal(await getCachedBookCover(url("reused"), directory), reused);
  assert.equal(requests(), 0);
  assert.ok((await entries()).bytes <= MAX_COVER_CACHE_BYTES);
  await assert.rejects(stat(oldest), { code: "ENOENT" });
});

test("expired covers are removed and refetched; abandoned temporary files are cleaned selectively", async (context) => {
  const { directory, cache, seed, requests } = await fixture(context);
  const expired = await seed("expired", image.length, COVER_CACHE_MAX_AGE_MS + 10000);
  const otherExpired = await seed("other-expired", image.length, COVER_CACHE_MAX_AGE_MS + 10000);
  const oldTemporary = `${expired}.12345678-abcd.tmp`;
  const freshTemporary = `${expired}.87654321-abcd.tmp`;
  const unrelated = join(cache, "keep.txt");
  for (const path of [oldTemporary, freshTemporary, unrelated]) await writeFile(path, image);
  const oldDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  await utimes(oldTemporary, oldDate, oldDate);
  assert.equal(await getCachedBookCover(url("expired"), directory), expired);
  assert.equal(requests(), 1);
  for (const path of [otherExpired, oldTemporary]) await assert.rejects(stat(path), { code: "ENOENT" });
  for (const path of [expired, freshTemporary, unrelated]) assert.deepEqual(await readFile(path), image);
});

test("concurrent downloads respect both quotas and leave complete images without temporary files", async (context) => {
  const { directory, cache, seed, entries } = await fixture(context);
  for (let i = 0; i < MAX_COVER_CACHE_BYTES / MAX_COVER_BYTES; i++) await seed(`large-${i}`, MAX_COVER_BYTES);
  for (let i = 20; i < MAX_CACHED_COVERS; i++) await seed(`tiny-${i}`);
  const paths = await Promise.all(
    Array.from({ length: 40 }, (_, i) => getCachedBookCover(url(`concurrent-${i}`), directory)),
  );
  const result = await entries();
  assert.ok(result.bytes <= MAX_COVER_CACHE_BYTES);
  assert.ok(result.count <= MAX_CACHED_COVERS);
  for (const path of paths) assert.deepEqual(await readFile(path), image);
  assert.ok(!(await readdir(cache)).some((name) => name.endsWith(".tmp")));
});

test("a cancelled cache write does not block later requests", async (context) => {
  const { directory, entries } = await fixture(context);
  const controller = new AbortController();
  context.mock.method(globalThis, "fetch", async () => {
    controller.abort();
    return new Response(image, { headers: { "Content-Type": "image/jpeg" } });
  });
  await assert.rejects(getCachedBookCover(url("cancelled"), directory, controller.signal), { name: "AbortError" });
  assert.equal((await entries()).count, 0);
  context.mock.restoreAll();
  context.mock.method(
    globalThis,
    "fetch",
    async () => new Response(image, { headers: { "Content-Type": "image/jpeg" } }),
  );
  const path = await getCachedBookCover(url("after-cancel"), directory);
  assert.deepEqual(await readFile(path), image);
});
