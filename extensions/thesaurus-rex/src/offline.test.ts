import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  acquireInstallLock,
  dbPath,
  insertEntries,
  lookup,
  openDb,
  releaseInstallLock,
} from "./db.ts";
import { removeOfflineData } from "./offline.ts";

const values = (entries: { value: string }[]) => entries.map((e) => e.value);

test("remove deletes the database files when no install is running", async () => {
  const dir = await mkdtemp(join(tmpdir(), "trex-rm-"));
  const db = openDb(dbPath(dir));
  await insertEntries(db, "syn", "wordnet", [["run", ["sprint"]]]);
  db.close();

  await removeOfflineData(dir);

  assert.equal(existsSync(dbPath(dir)), false);
  assert.equal(existsSync(dbPath(dir) + "-wal"), false);
  assert.equal(existsSync(dbPath(dir) + "-shm"), false);
  assert.equal(
    acquireInstallLock(dir),
    true,
    "lock released even if the sibling file remains",
  );
  releaseInstallLock(dir);
});

test("remove refuses while an install holds the lock", async () => {
  const dir = await mkdtemp(join(tmpdir(), "trex-rm-lock-"));
  const installer = openDb(dbPath(dir));
  await insertEntries(installer, "syn", "wordnet", [["run", ["sprint"]]]);
  assert.equal(acquireInstallLock(dir), true);

  await assert.rejects(
    () => removeOfflineData(dir),
    /already running/,
    "deletion must not unlink a database another command is installing into",
  );
  assert.equal(existsSync(dbPath(dir)), true, "database left in place");
  assert.deepEqual(
    values(lookup(installer, "run", "syn")),
    ["sprint"],
    "in-flight install still has its file",
  );

  releaseInstallLock(dir);
  installer.close();
  await removeOfflineData(dir);
  assert.equal(existsSync(dbPath(dir)), false, "free to delete once released");
});
