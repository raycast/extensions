import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ACTIVE_INDEX_FILENAME,
  cleanupLegacyIndexes,
  cleanupStaleBuildTemps,
  openIndexDataStream,
  prepareIndex,
  publishIndex,
  readIndexHeader,
} from "../src/lib/index-files.ts";

async function withDirectory(action) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "pathseek-index-test-"));
  try {
    await action(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function meta(roots = ["/test"], count = 2) {
  return { version: 2, createdAt: "2026-10-24T08:00:00.000Z", roots, count };
}

async function stage(dir, label, content = "foo\0bar\0", roots = ["/test"]) {
  const raw = path.join(dir, label + ".paths.tmp");
  const staged = path.join(dir, label + ".nul.tmp");
  await writeFile(raw, content);
  const count = [...content].filter((char) => char === "\0").length;
  const metadata = await prepareIndex(raw, staged, meta(roots, count));
  return { raw, staged, metadata };
}

async function streamText(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

test("v2 stores metadata and paths in one atomically published file", async () => {
  await withDirectory(async (dir) => {
    const { staged, metadata } = await stage(dir, "first");
    assert.equal(metadata.filename, ACTIVE_INDEX_FILENAME);
    assert.equal(metadata.version, 2);
    assert.ok(metadata.dataOffset > 12);
    await publishIndex(staged, dir);
    const saved = await readIndexHeader(path.join(dir, ACTIVE_INDEX_FILENAME));
    assert.equal(saved.count, 2);
    assert.equal(saved.roots[0], "/test");
    assert.equal(await streamText(await openIndexDataStream(path.join(dir, ACTIVE_INDEX_FILENAME))), "foo\0bar\0");
  });
});

test("reader snapshot remains complete after atomic replacement with different header sizes", async () => {
  await withDirectory(async (dir) => {
    const first = await stage(dir, "first", "old1\0old2\0", ["/a"]);
    await publishIndex(first.staged, dir);
    const active = path.join(dir, ACTIVE_INDEX_FILENAME);
    const reader = await openIndexDataStream(active);
    const next = await stage(dir, "next", "new1\0new2\0", ["/some/much/longer/path/to/change/header/size"]);
    await publishIndex(next.staged, dir);
    assert.equal(await streamText(reader), "old1\0old2\0");
    assert.equal(await streamText(await openIndexDataStream(active)), "new1\0new2\0");
  });
});

test("failed staging/publishing cannot overwrite a previously working index", async () => {
  await withDirectory(async (dir) => {
    const first = await stage(dir, "first", "healthy\0");
    await publishIndex(first.staged, dir);
    const active = path.join(dir, ACTIVE_INDEX_FILENAME);
    const missing = path.join(dir, "missing.tmp");
    await assert.rejects(publishIndex(missing, dir));
    const corrupt = path.join(dir, "corrupt.nul.tmp");
    await writeFile(corrupt, "not an index\0");
    await assert.rejects(publishIndex(corrupt, dir));
    assert.equal(await streamText(await openIndexDataStream(active)), "healthy\0");
  });
});

test("there is no separate index.json publication step", async () => {
  await withDirectory(async (dir) => {
    const first = await stage(dir, "first");
    await publishIndex(first.staged, dir);
    assert.equal((await readdir(dir)).includes("index.json"), false);
    const info = await readIndexHeader(path.join(dir, ACTIVE_INDEX_FILENAME));
    assert.equal(info.createdAt, "2026-10-24T08:00:00.000Z");
  });
});

test("legacy v1 UUID payload can be read without a v2 header", async () => {
  await withDirectory(async (dir) => {
    const legacy = path.join(dir, "index-11111111-1111-4111-8111-111111111111.nul");
    await writeFile(legacy, "/x/a\0/x/b\0");
    assert.equal(await streamText(await openIndexDataStream(legacy)), "/x/a\0/x/b\0");
  });
});

test("cleanup preserves current index and young UUID generations", async () => {
  await withDirectory(async (dir) => {
    const first = await stage(dir, "first");
    await publishIndex(first.staged, dir);
    const active = path.join(dir, ACTIVE_INDEX_FILENAME);
    const old = path.join(dir, "index-11111111-1111-4111-8111-111111111111.nul");
    const recent = path.join(dir, "index-22222222-2222-4222-8222-222222222222.nul");
    await writeFile(old, "old\0");
    await writeFile(recent, "recent\0");
    const past = new Date(Date.now() - 3 * 24 * 3600_000);
    await utimes(old, past, past);
    assert.equal(await cleanupLegacyIndexes(dir), 1);
    assert.equal(await readIndexHeader(active).then((m) => m.version), 2);
    assert.equal(await readFile(recent, "utf8"), "recent\0");
    assert.equal(await cleanupLegacyIndexes(dir, Date.now() + 4 * 24 * 3600_000), 1);
    assert.equal((await readdir(dir)).includes(ACTIVE_INDEX_FILENAME), true);
  });
});

test("legacy cleanup fails closed without a valid new v2 file", async () => {
  await withDirectory(async (dir) => {
    const old = path.join(dir, "index-33333333-3333-4333-8333-333333333333.nul");
    await writeFile(old, "old\0");
    await assert.rejects(cleanupLegacyIndexes(dir));
    assert.equal(await readFile(old, "utf8"), "old\0");
  });
});


test("stale-temp maintenance removes only old recognized build artifacts", async () => {
  await withDirectory(async (dir) => {
    const active = path.join(dir, ACTIVE_INDEX_FILENAME);
    const first = await stage(dir, "first");
    await publishIndex(first.staged, dir);

    const oldPaths = path.join(dir, "index-11111111-1111-4111-8111-111111111111.paths.tmp");
    const oldStaged = path.join(dir, "index-22222222-2222-4222-8222-222222222222.nul.tmp");
    const young = path.join(dir, "index-33333333-3333-4333-8333-333333333333.paths.tmp");
    const unrelated = path.join(dir, "user-notes.tmp");
    await writeFile(oldPaths, "orphaned");
    await writeFile(oldStaged, "orphaned");
    await writeFile(young, "current-build");
    await writeFile(unrelated, "do not touch");
    const past = new Date(Date.now() - 3 * 24 * 3600_000);
    await utimes(oldPaths, past, past);
    await utimes(oldStaged, past, past);
    await utimes(unrelated, past, past);

    assert.equal(await cleanupStaleBuildTemps(dir), 2);
    assert.deepEqual(
      (await readdir(dir)).filter((name) => name.endsWith(".tmp")).sort(),
      ["first.paths.tmp", "index-33333333-3333-4333-8333-333333333333.paths.tmp", "user-notes.tmp"],
    );
    assert.equal((await readIndexHeader(active)).version, 2);
    assert.equal(await cleanupStaleBuildTemps(dir), 0);
  });
});
