import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import lockfile from "proper-lockfile";
import {
  ACTIVE_INDEX_FILENAME,
  openIndexDataStream,
  prepareIndex,
  publishIndex,
} from "../src/lib/index-files.ts";

async function stageAndPublish(dir, name, value) {
  const raw = path.join(dir, name + ".paths.tmp");
  const staged = path.join(dir, name + ".nul.tmp");
  await writeFile(raw, Buffer.from(value + "\0"));
  await prepareIndex(raw, staged, {
    version: 2,
    createdAt: "2026-10-24T09:00:00.000Z",
    count: 1,
    roots: ["/test"],
  });
  await publishIndex(staged, dir);
}

async function readPaths(dir) {
  const stream = await openIndexDataStream(path.join(dir, ACTIVE_INDEX_FILENAME));
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

test("exclusive rebuild lock rejects a second writer but allows a later sequential build", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "pathseek-lock-test-"));
  try {
    const opts = { realpath: false, stale: 120_000, update: 30_000, retries: 0 };
    const releaseFirst = await lockfile.lock(dir, opts);
    try {
      await stageAndPublish(dir, "first", "/test/first");
      await assert.rejects(
        () => lockfile.lock(dir, opts),
        (error) => error?.code === "ELOCKED",
      );
      const snapshot = await openIndexDataStream(path.join(dir, ACTIVE_INDEX_FILENAME));
      const releaseSnapshot = snapshot;
      // Existing reader stays on the old inode when a later writer publishes.
      await releaseFirst();
      const releaseSecond = await lockfile.lock(dir, opts);
      try {
        await stageAndPublish(dir, "second", "/test/second");
        const chunks = [];
        for await (const chunk of releaseSnapshot) chunks.push(chunk);
        assert.equal(Buffer.concat(chunks).toString("utf8"), "/test/first\0");
        assert.equal(await readPaths(dir), "/test/second\0");
      } finally {
        await releaseSecond();
      }
    } finally {
      // The first lock may already have been explicitly released above.
      await releaseFirst().catch(() => undefined);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
