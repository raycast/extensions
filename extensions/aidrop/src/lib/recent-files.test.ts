import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loadRecentFiles, loadRecentFilesFromFolders } from "./recent-files";

test("loadRecentFiles filters hidden entries and directories, sorts by mtime descending, and limits results", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aidrop-downloads-"));

  await fs.writeFile(path.join(tempDir, ".hidden.png"), "hidden");
  await fs.mkdir(path.join(tempDir, "nested-folder"));

  const recent = path.join(tempDir, "recent.pdf");
  const middle = path.join(tempDir, "middle.zip");
  const oldest = path.join(tempDir, "oldest.txt");

  await fs.writeFile(oldest, "oldest");
  await fs.writeFile(middle, "middle");
  await fs.writeFile(recent, "recent");

  await fs.utimes(
    oldest,
    new Date("2026-03-13T00:00:00Z"),
    new Date("2026-03-13T00:00:00Z"),
  );
  await fs.utimes(
    middle,
    new Date("2026-03-13T01:00:00Z"),
    new Date("2026-03-13T01:00:00Z"),
  );
  await fs.utimes(
    recent,
    new Date("2026-03-13T02:00:00Z"),
    new Date("2026-03-13T02:00:00Z"),
  );

  for (let index = 0; index < 12; index += 1) {
    const extraPath = path.join(tempDir, `extra-${index}.dat`);
    await fs.writeFile(extraPath, String(index));
    await fs.utimes(
      extraPath,
      new Date(`2026-03-13T03:${String(index).padStart(2, "0")}:00Z`),
      new Date(`2026-03-13T03:${String(index).padStart(2, "0")}:00Z`),
    );
  }

  const files = await loadRecentFiles(tempDir);

  assert.equal(files.length, 10);
  assert.deepEqual(
    files.map((file) => file.name),
    [
      "extra-11.dat",
      "extra-10.dat",
      "extra-9.dat",
      "extra-8.dat",
      "extra-7.dat",
      "extra-6.dat",
      "extra-5.dat",
      "extra-4.dat",
      "extra-3.dat",
      "extra-2.dat",
    ],
  );

  assert.ok(files.every((file) => !file.name.startsWith(".")));
  assert.ok(files.every((file) => file.path.startsWith(tempDir)));
  assert.ok(files.every((file) => file.sourceFolder === tempDir));

  await fs.rm(tempDir, { recursive: true, force: true });
});

test("loadRecentFilesFromFolders merges files from multiple folders sorted by mtime descending", async () => {
  const dir1 = await fs.mkdtemp(path.join(os.tmpdir(), "aidrop-folder1-"));
  const dir2 = await fs.mkdtemp(path.join(os.tmpdir(), "aidrop-folder2-"));

  const file1 = path.join(dir1, "alpha.txt");
  const file2 = path.join(dir2, "beta.txt");
  const file3 = path.join(dir1, "gamma.txt");

  await fs.writeFile(file1, "a");
  await fs.writeFile(file2, "b");
  await fs.writeFile(file3, "c");

  await fs.utimes(
    file1,
    new Date("2026-03-13T03:00:00Z"),
    new Date("2026-03-13T03:00:00Z"),
  );
  await fs.utimes(
    file2,
    new Date("2026-03-13T01:00:00Z"),
    new Date("2026-03-13T01:00:00Z"),
  );
  await fs.utimes(
    file3,
    new Date("2026-03-13T02:00:00Z"),
    new Date("2026-03-13T02:00:00Z"),
  );

  const files = await loadRecentFilesFromFolders([dir1, dir2]);

  assert.equal(files.length, 3);
  assert.deepEqual(
    files.map((f) => f.name),
    ["alpha.txt", "gamma.txt", "beta.txt"],
  );
  assert.equal(files[0].sourceFolder, dir1);
  assert.equal(files[2].sourceFolder, dir2);

  await fs.rm(dir1, { recursive: true, force: true });
  await fs.rm(dir2, { recursive: true, force: true });
});

test("loadRecentFilesFromFolders skips folders that fail to read", async () => {
  const dir1 = await fs.mkdtemp(path.join(os.tmpdir(), "aidrop-ok-"));
  await fs.writeFile(path.join(dir1, "file.txt"), "content");

  const files = await loadRecentFilesFromFolders([
    dir1,
    "/nonexistent-folder-xyz",
  ]);

  assert.equal(files.length, 1);
  assert.equal(files[0].name, "file.txt");

  await fs.rm(dir1, { recursive: true, force: true });
});
