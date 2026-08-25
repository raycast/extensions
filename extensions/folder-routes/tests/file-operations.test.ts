import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";

import { performFileOperation } from "../src/services/file-operations";

interface FileOperationFixture {
  destination: string;
  root: string;
  source: string;
}

async function createFixture(t: TestContext, fileName = "example.txt"): Promise<FileOperationFixture> {
  const root = await mkdtemp(join(tmpdir(), "folder-routes-file-operations-"));
  const sourceDirectory = join(root, "source");
  const destination = join(root, "destination");
  const source = join(sourceDirectory, fileName);

  await mkdir(sourceDirectory);
  await mkdir(destination);
  await writeFile(source, "new content\n", "utf8");
  t.after(() => rm(root, { recursive: true, force: true }));

  return { destination, root, source };
}

test("copy preserves the source and creates the destination item", async (t) => {
  const fixture = await createFixture(t);
  const result = await performFileOperation("copy", [fixture.source], fixture.destination, {
    conflictBehavior: "skip",
  });

  assert.equal(result.successCount, 1);
  assert.equal(await readFile(fixture.source, "utf8"), "new content\n");
  assert.equal(await readFile(join(fixture.destination, "example.txt"), "utf8"), "new content\n");
});

test("move removes the source only after creating the destination item", async (t) => {
  const fixture = await createFixture(t);
  const result = await performFileOperation("move", [fixture.source], fixture.destination, {
    conflictBehavior: "skip",
  });

  assert.equal(result.successCount, 1);
  await assert.rejects(readFile(fixture.source, "utf8"), { code: "ENOENT" });
  assert.equal(await readFile(join(fixture.destination, "example.txt"), "utf8"), "new content\n");
});

test("skip leaves a conflicting destination and the source unchanged", async (t) => {
  const fixture = await createFixture(t);
  const target = join(fixture.destination, "example.txt");
  await writeFile(target, "existing content\n", "utf8");

  const result = await performFileOperation("move", [fixture.source], fixture.destination, {
    conflictBehavior: "skip",
  });

  assert.equal(result.skippedCount, 1);
  assert.equal(await readFile(fixture.source, "utf8"), "new content\n");
  assert.equal(await readFile(target, "utf8"), "existing content\n");
});

test("overwrite replaces a conflict and removes the moved source", async (t) => {
  const fixture = await createFixture(t);
  const target = join(fixture.destination, "example.txt");
  await writeFile(target, "existing content\n", "utf8");

  const result = await performFileOperation("move", [fixture.source], fixture.destination, {
    conflictBehavior: "overwrite",
  });

  assert.equal(result.successCount, 1);
  await assert.rejects(readFile(fixture.source, "utf8"), { code: "ENOENT" });
  assert.equal(await readFile(target, "utf8"), "new content\n");
});

test("keep both preserves the conflict and creates a suffixed copy", async (t) => {
  const fixture = await createFixture(t);
  const target = join(fixture.destination, "example.txt");
  await writeFile(target, "existing content\n", "utf8");

  const result = await performFileOperation("copy", [fixture.source], fixture.destination, {
    conflictBehavior: "keep-both",
  });

  assert.equal(result.successCount, 1);
  assert.equal(await readFile(target, "utf8"), "existing content\n");
  assert.equal(await readFile(join(fixture.destination, "example copy.txt"), "utf8"), "new content\n");
});

test("prompt cancellation skips without modifying either item", async (t) => {
  const fixture = await createFixture(t);
  const target = join(fixture.destination, "example.txt");
  await writeFile(target, "existing content\n", "utf8");

  const result = await performFileOperation("copy", [fixture.source], fixture.destination, {
    conflictBehavior: "prompt",
    confirmOverwrite: async () => false,
  });

  assert.equal(result.skippedCount, 1);
  assert.equal(await readFile(fixture.source, "utf8"), "new content\n");
  assert.equal(await readFile(target, "utf8"), "existing content\n");
});
