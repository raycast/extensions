import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { atomicWriteFile } from "../src/lib/atomic-write.ts";

test("atomicWriteFile writes and overwrites target file", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "append-to-file-"));

  try {
    const target = path.join(dir, "notes.txt");

    await atomicWriteFile(target, Buffer.from("first", "utf8"));
    assert.equal(await readFile(target, "utf8"), "first");

    await writeFile(target, "old", "utf8");
    await atomicWriteFile(target, Buffer.from("second", "utf8"));
    assert.equal(await readFile(target, "utf8"), "second");

    const files = await readdir(dir);
    const tempFiles = files.filter((name) =>
      name.startsWith(".notes.txt.tmp-"),
    );
    assert.deepEqual(tempFiles, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
