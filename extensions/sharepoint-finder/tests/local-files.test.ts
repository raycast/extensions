import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { findFilesByName } from "../src/local-files.ts";

test("finds an exact filename recursively", async (context) => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "sharepoint-finder-"));
  context.after(() => rm(rootPath, { recursive: true, force: true }));
  const folderPath = path.join(rootPath, "Social Media");
  await mkdir(folderPath);
  const filePath = path.join(folderPath, "FOUR12 Media schedule.xlsx");
  await writeFile(filePath, "test");

  assert.deepEqual(
    await findFilesByName(rootPath, "FOUR12 Media schedule.xlsx"),
    [filePath],
  );
});

test("stops after finding enough duplicate filenames", async (context) => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "sharepoint-finder-"));
  context.after(() => rm(rootPath, { recursive: true, force: true }));
  await Promise.all(
    ["First", "Second", "Third"].map(async (folderName) => {
      const folderPath = path.join(rootPath, folderName);
      await mkdir(folderPath);
      await writeFile(path.join(folderPath, "Schedule.xlsx"), "test");
    }),
  );

  assert.equal((await findFilesByName(rootPath, "Schedule.xlsx")).length, 2);
});

test("rejects a filename containing a path", async () => {
  await assert.rejects(
    findFilesByName("/tmp", "../Schedule.xlsx"),
    /invalid file name/,
  );
});
