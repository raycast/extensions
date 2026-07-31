import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ensureExecutable } from "./executable.ts";

test("adds execute bits to a bundled helper without changing its contents", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "fp-progress-executable-"));
  context.after(() => rm(directory, { force: true, recursive: true }));
  const helperPath = path.join(directory, "fp-progress");
  const contents = "test helper\n";

  await writeFile(helperPath, contents, { mode: 0o644 });
  await ensureExecutable(helperPath);

  const helperStats = await stat(helperPath);
  assert.equal(helperStats.mode & 0o777, 0o755);
  assert.equal(await readFile(helperPath, "utf8"), contents);
});

test("leaves an executable bundled helper's mode unchanged", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "fp-progress-executable-"));
  context.after(() => rm(directory, { force: true, recursive: true }));
  const helperPath = path.join(directory, "fp-progress");

  await writeFile(helperPath, "test helper\n", { mode: 0o700 });
  await ensureExecutable(helperPath);

  const helperStats = await stat(helperPath);
  assert.equal(helperStats.mode & 0o777, 0o700);
});

test("repairs a helper when only another permission class has execute access", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "fp-progress-executable-"));
  context.after(() => rm(directory, { force: true, recursive: true }));
  const helperPath = path.join(directory, "fp-progress");

  await writeFile(helperPath, "test helper\n", { mode: 0o645 });
  await ensureExecutable(helperPath);

  const helperStats = await stat(helperPath);
  assert.equal(helperStats.mode & 0o777, 0o755);
});

test("refuses to repair a symlink", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "fp-progress-executable-"));
  context.after(() => rm(directory, { force: true, recursive: true }));
  const targetPath = path.join(directory, "target");
  const helperPath = path.join(directory, "fp-progress");

  await writeFile(targetPath, "test helper\n", { mode: 0o644 });
  await symlink(targetPath, helperPath);

  await assert.rejects(ensureExecutable(helperPath), /not a regular file/);
  const targetStats = await stat(targetPath);
  assert.equal(targetStats.mode & 0o777, 0o644);
});
