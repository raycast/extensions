import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanPreviews, exportPng, readAvatar, writePreview } from "../src/lib/files";

test("exports without overwriting and cleans only stale generated previews", async () => {
  const dir = await mkdtemp(join(tmpdir(), "xeet-files-"));
  try {
    const source = await writePreview(dir, Buffer.from("png bytes"));
    const first = await exportPng(source, join(dir, "exports"));
    const second = await exportPng(source, join(dir, "exports"));
    assert.notEqual(first, second);
    assert.equal((await readFile(first)).toString(), "png bytes");
    const other = join(dir, "unrelated.png");
    await writeFile(other, "keep");
    await utimes(source, new Date(0), new Date(0));
    await utimes(other, new Date(0), new Date(0));
    await cleanPreviews(dir);
    assert.deepEqual((await readdir(dir)).sort(), ["exports", "unrelated.png"]);
    await assert.rejects(readAvatar(other), /PNG, JPEG, or WebP/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
