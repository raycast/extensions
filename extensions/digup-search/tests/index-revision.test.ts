import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { indexRevision } from "../src/digup/index-revision";

test("database and WAL changes in either index change the revision", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "digup-revision-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const launch = { program: "digup", args: ["search-service", "--index", directory], env: {} };
  let previous = await indexRevision(launch);
  assert.equal(previous, await indexRevision(launch), "an unchanged index has the same revision");
  for (const name of ["index.sqlite", "index.sqlite-wal", "code.sqlite", "code.sqlite-wal"]) {
    const file = join(directory, name);
    await writeFile(file, "first");
    let next = await indexRevision(launch);
    assert.notEqual(next, previous, `creating ${name} changes the revision`);
    previous = next;
    await writeFile(file, "changed with more data");
    next = await indexRevision(launch);
    assert.notEqual(next, previous, `writing ${name} changes the revision`);
    previous = next;
    await rm(file);
    next = await indexRevision(launch);
    assert.notEqual(next, previous, `removing ${name} changes the revision`);
    previous = next;
  }
});

test("a launch without an explicit index has no revision", async () => {
  assert.equal(await indexRevision({ program: "digup", args: ["search-service"], env: {} }), undefined);
});

test("an inaccessible index error is not treated as a missing file", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "digup-revision-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "not-a-directory");
  await writeFile(file, "sample");
  await assert.rejects(indexRevision({ program: "digup", args: ["--index", file], env: {} }), { code: "ENOTDIR" });
});
