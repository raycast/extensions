import assert from "node:assert/strict";
import fs, { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import { exportMigration } from "../src/lib/exporter";
import { createSession } from "./helpers";

async function outputDirectory(t: TestContext) {
  const path = await mkdtemp(join(tmpdir(), "textexpander-export-"));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

test("group exports contain only selected, edited snippets and a body-free report", async (t) => {
  const directory = await outputDirectory(t);
  const session = createSession();
  const first = session.conversion.snippets[0]!;
  session.edits[first.id] = { name: "Edited", text: "private body", keyword: ";edited" };
  session.groupNames.Email = "Renamed / Group";
  const result = await exportMigration({
    directory,
    filename: "migration.json",
    mode: "groups",
    includeReport: true,
    session,
  });
  assert.equal(result.count, 2);
  assert.equal(result.directory, join(directory, "migration-groups"));
  assert.equal(result.paths.length, 3);
  assert.deepEqual(JSON.parse(await readFile(result.paths[0]!, "utf8")), [session.edits[first.id]]);
  assert.equal((await stat(result.directory!)).mode & 0o777, 0o700);
  for (const path of result.paths) assert.equal((await stat(path)).mode & 0o777, 0o600);
  const report = await readFile(result.reportPath!, "utf8");
  assert.equal(JSON.parse(report).summary.exported, 2);
  assert.ok(!report.includes("private body"));
  await assert.rejects(
    exportMigration({ directory, filename: "migration.json", mode: "groups", includeReport: false, session }),
    { code: "EEXIST" },
  );
  assert.equal((await readdir(result.directory!)).length, 3);
});

test("single exports honor selection and report-only exports do not claim snippets were exported", async (t) => {
  const directory = await outputDirectory(t);
  const session = createSession();
  session.selectedIds = [session.selectedIds[1]!];
  const result = await exportMigration({
    directory,
    filename: "selected.json",
    mode: "single",
    includeReport: false,
    session,
  });
  assert.deepEqual(JSON.parse(await readFile(result.paths[0]!, "utf8")), [session.conversion.snippets[1]!.snippet]);
  session.selectedIds = [];
  const report = await exportMigration({
    directory,
    filename: "report.json",
    mode: "report",
    includeReport: true,
    session,
  });
  assert.equal(report.count, 0);
  assert.equal(JSON.parse(await readFile(report.reportPath!, "utf8")).summary.exported, 0);
});

test("rollback tolerates a missing output, removes the rest, and preserves the export failure", async (t) => {
  const directory = await outputDirectory(t);
  const groupDirectory = join(directory, "retry-groups");
  const failure = Object.assign(new Error("No space left on device"), { code: "ENOSPC" });
  const realWrite = fs.writeFile;
  let writes = 0;
  t.mock.method(fs, "writeFile", async (...args: Parameters<typeof fs.writeFile>) => {
    if (++writes === 3) {
      await rm(join(groupDirectory, "001-Email.json"));
      throw failure;
    }
    return realWrite(...args);
  });
  const options = {
    directory,
    filename: "retry.json",
    mode: "groups",
    includeReport: true,
    session: createSession(),
  } as const;
  await assert.rejects(exportMigration(options), (error) => error === failure);
  assert.deepEqual(await readdir(directory), []);
  const retry = await exportMigration(options);
  assert.equal(retry.paths.length, 3);
});

test("rollback attempts later cleanup after an unlink failure and keeps the original error", async (t) => {
  const directory = await outputDirectory(t);
  const groupDirectory = join(directory, "retry-groups");
  const failure = new Error("Report write failed");
  const realWrite = fs.writeFile;
  const realUnlink = fs.unlink;
  let writes = 0;
  const unlinked: string[] = [];
  t.mock.method(fs, "writeFile", async (...args: Parameters<typeof fs.writeFile>) => {
    if (++writes === 3) throw failure;
    return realWrite(...args);
  });
  t.mock.method(fs, "unlink", async (path: string) => {
    unlinked.push(path);
    if (path.endsWith("001-Email.json")) throw Object.assign(new Error("Permission denied"), { code: "EACCES" });
    return realUnlink(path);
  });
  await assert.rejects(
    exportMigration({
      directory,
      filename: "retry.json",
      mode: "groups",
      includeReport: true,
      session: createSession(),
    }),
    (error) => error === failure,
  );
  assert.ok(unlinked.includes(join(groupDirectory, "002-Work.json")));
  assert.deepEqual(await readdir(directory), []);
});

test("a failed write keeps its original error when its partial file is already gone", async (t) => {
  const directory = await outputDirectory(t);
  const failure = new Error("Write failed");
  t.mock.method(
    fs,
    "writeFile",
    async () => {
      await rm(join(directory, "retry.json"));
      throw failure;
    },
    { times: 1 },
  );
  const options = {
    directory,
    filename: "retry.json",
    mode: "single",
    includeReport: false,
    session: createSession(),
  } as const;
  await assert.rejects(exportMigration(options), (error) => error === failure);
  assert.equal((await exportMigration(options)).count, 2);
});
