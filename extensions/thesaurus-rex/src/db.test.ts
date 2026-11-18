import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  acquireInstallLock,
  dbPath,
  getMeta,
  insertEntries,
  installLockPath,
  lookup,
  openDb,
  releaseInstallLock,
  setMeta,
} from "./db.ts";

const values = (entries: { value: string }[]) => entries.map((e) => e.value);

async function freshDb() {
  const dir = await mkdtemp(join(tmpdir(), "trex-db-"));
  return openDb(dbPath(dir));
}

test("entries round-trip through the store", async () => {
  const db = await freshDb();
  const count = await insertEntries(db, "syn", "wordnet", [
    ["Big", ["large", "ample"]],
    ["run", ["sprint"]],
  ]);
  assert.equal(count, 2);
  assert.deepEqual(values(lookup(db, "big", "syn")), ["large", "ample"]);
  assert.deepEqual(values(lookup(db, "  BIG ", "syn")), ["large", "ample"]);
  assert.deepEqual(values(lookup(db, "missing", "syn")), []);
  assert.deepEqual(values(lookup(db, "", "syn")), []);
});

test("a torn payload costs its own row, not the lookup", async () => {
  const db = await freshDb();
  await insertEntries(db, "syn", "wordnet", [["big", ["large"]]]);
  db.prepare("UPDATE entries SET payload = ? WHERE headword = 'big'").run(
    '["lar',
  );
  assert.deepEqual(values(lookup(db, "big", "syn")), []);
});

test("kinds do not collide, and a rebuild replaces only its own kind", async () => {
  const db = await freshDb();
  await insertEntries(db, "syn", "wordnet", [["run", ["sprint"]]]);
  await insertEntries(db, "ant", "wordnet", [["run", ["walk"]]]);
  assert.deepEqual(values(lookup(db, "run", "ant")), ["walk"]);

  await insertEntries(db, "syn", "wordnet", [["run", ["dash"]]]);
  assert.deepEqual(values(lookup(db, "run", "syn")), ["dash"], "syn replaced");
  assert.deepEqual(values(lookup(db, "run", "ant")), ["walk"], "ant untouched");
});

test("a failed ingest rolls back to the previous dataset", async () => {
  const db = await freshDb();
  await insertEntries(db, "syn", "wordnet", [["run", ["sprint"]]]);

  async function* dies(): AsyncGenerator<[string, string[]]> {
    yield ["walk", ["stroll"]];
    throw new Error("connection died");
  }
  await assert.rejects(
    () => insertEntries(db, "syn", "wordnet", dies()),
    /connection died/,
  );

  assert.deepEqual(
    values(lookup(db, "run", "syn")),
    ["sprint"],
    "old data survives",
  );
  assert.deepEqual(
    values(lookup(db, "walk", "syn")),
    [],
    "partial data discarded",
  );
});

test("suffix strip only fires when the stem is really in the DB", async () => {
  const db = await freshDb();
  await insertEntries(db, "syn", "wordnet", [
    ["run", ["sprint"]],
    ["carry", ["bear"]],
    ["bus", ["coach"]],
    ["glide", ["slide"]],
  ]);

  assert.deepEqual(
    values(lookup(db, "running", "syn")),
    ["sprint"],
    "doubled consonant undone",
  );
  assert.deepEqual(values(lookup(db, "runs", "syn")), ["sprint"]);
  assert.deepEqual(values(lookup(db, "carries", "syn")), ["bear"], "ies -> y");
  assert.deepEqual(
    values(lookup(db, "gliding", "syn")),
    ["slide"],
    "silent e restored",
  );
  assert.deepEqual(
    values(lookup(db, "bus", "syn")),
    ["coach"],
    "exact match wins over stripping to 'bu'",
  );
});

test("a retired dictionary's rows go, and the rest survive", async () => {
  const dir = await mkdtemp(join(tmpdir(), "trex-retire-"));
  const path = dbPath(dir);

  const before = openDb(path);
  await insertEntries(before, "syn", "wordnet", [["run", ["sprint"]]]);
  // a dictionary that has since been dropped from SOURCES
  before
    .prepare("INSERT INTO entries VALUES (?, ?, ?, ?)")
    .run("run", "syn", "moby", '["Brownian movement"]');
  setMeta(before, "moby:entries", "30260");
  setMeta(before, "wordnet:synonyms", "113779");
  before.close();

  const db = openDb(path);
  assert.deepEqual(
    values(lookup(db, "run", "syn")),
    ["sprint"],
    "retired rows gone, WordNet untouched",
  );
  assert.equal(getMeta(db, "moby:entries"), undefined, "its meta gone too");
  assert.equal(
    getMeta(db, "wordnet:synonyms"),
    "113779",
    "no re-download needed",
  );
});

test("a pre-source database is dropped rather than failing every insert", async () => {
  const dir = await mkdtemp(join(tmpdir(), "trex-old-"));
  const path = dbPath(dir);

  // the shape shipped before dictionaries were attributed
  const old = new DatabaseSync(path);
  old.exec(`
    CREATE TABLE entries (headword TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (headword, kind)) WITHOUT ROWID;
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT INTO entries VALUES ('run', 'syn', '["sprint"]');
    INSERT INTO meta VALUES ('syn:entries', '30260');
  `);
  old.close();

  const db = openDb(path);
  assert.equal(getMeta(db, "syn:entries"), undefined, "stale counts cleared");
  assert.deepEqual(lookup(db, "run", "syn"), [], "stale rows gone");

  // and the new shape works, which is what actually broke
  await insertEntries(db, "syn", "wordnet", [["run", ["sprint"]]]);
  assert.deepEqual(values(lookup(db, "run", "syn")), ["sprint"]);
});

test("a corrupt database is binned rather than crashing every command", async () => {
  const dir = await mkdtemp(join(tmpdir(), "trex-corrupt-"));
  const path = dbPath(dir);
  await writeFile(path, "this is not a database at all".repeat(50));

  const db = openDb(path);
  assert.deepEqual(lookup(db, "run", "syn"), [], "starts empty");
  await insertEntries(db, "syn", "wordnet", [["run", ["sprint"]]]);
  assert.deepEqual(values(lookup(db, "run", "syn")), ["sprint"], "and works");
});

test("meta survives and overwrites", async () => {
  const db = await freshDb();
  assert.equal(getMeta(db, "syn:source"), undefined);
  setMeta(db, "syn:source", "https://example.test/a");
  setMeta(db, "syn:source", "https://example.test/b");
  assert.equal(getMeta(db, "syn:source"), "https://example.test/b");
});

test("only one install holds the lock, and a dropped connection is taken over", async () => {
  const dir = await mkdtemp(join(tmpdir(), "trex-lock-"));
  assert.equal(acquireInstallLock(dir), true);
  assert.equal(acquireInstallLock(dir), false, "a second install is refused");

  const other = new DatabaseSync(installLockPath(dir));
  other.exec("PRAGMA busy_timeout = 0");
  assert.throws(
    () => other.exec("BEGIN IMMEDIATE"),
    /database is locked/,
    "another connection cannot take a write lock while it is held",
  );
  other.close();

  releaseInstallLock(dir);
  assert.equal(acquireInstallLock(dir), true, "released, so free again");
  releaseInstallLock(dir);

  // a crash mid-install closes the connection: the OS drops the lock
  const crashed = new DatabaseSync(installLockPath(dir));
  crashed.exec("PRAGMA busy_timeout = 0");
  crashed.exec("BEGIN IMMEDIATE");
  crashed.close();
  assert.equal(
    acquireInstallLock(dir),
    true,
    "closed connection releases the lock",
  );
  releaseInstallLock(dir);

  await writeFile(installLockPath(dir), "12345");
  assert.equal(
    acquireInstallLock(dir),
    true,
    "leftover non-db lock is replaced",
  );
  assert.equal(
    existsSync(`${installLockPath(dir)}.${process.pid}.stale`),
    false,
    "junk is discarded, not left beside a live lock",
  );
  releaseInstallLock(dir);
});

test("unlinking the database does not drop the install lock", async () => {
  const dir = await mkdtemp(join(tmpdir(), "trex-lock-unlink-"));
  const path = dbPath(dir);
  openDb(path).close();
  assert.equal(acquireInstallLock(dir), true);

  await rm(path, { force: true });
  await rm(path + "-wal", { force: true });
  await rm(path + "-shm", { force: true });

  assert.equal(
    acquireInstallLock(dir),
    false,
    "lock lives beside the database, so deletion cannot drop it",
  );
  releaseInstallLock(dir);
});
