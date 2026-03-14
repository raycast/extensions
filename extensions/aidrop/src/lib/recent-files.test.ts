import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loadRecentFiles } from "./recent-files";

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

  await fs.rm(tempDir, { recursive: true, force: true });
});
