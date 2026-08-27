import { DatabaseSync } from "node:sqlite";
import { renameSync, rmSync } from "node:fs";
import { join } from "node:path";

export type Kind = "syn" | "ant" | "def" | "pro";

export const SOURCES = {
  wordnet: "Open English WordNet",
} as const;

export type Source = keyof typeof SOURCES;

const SOURCE_ORDER = Object.keys(SOURCES) as Source[];

export const DB_NAME = "offline.db";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS entries (
    headword TEXT NOT NULL,
    kind     TEXT NOT NULL,
    source   TEXT NOT NULL,
    payload  TEXT NOT NULL,
    PRIMARY KEY (headword, kind, source)
  ) WITHOUT ROWID;
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

export function openDb(path: string): DatabaseSync {
  try {
    return prepareDb(path);
  } catch (error) {
    // A half-written file would otherwise throw on open and take every command with
    // it, unrecoverably from inside Raycast. The DB is a rebuildable cache, so the
    // safe move is to bin it and let the empty view offer the download again.
    if (!isCorrupt(error)) throw error;
    for (const suffix of ["", "-wal", "-shm"])
      rmSync(path + suffix, { force: true });
    return prepareDb(path);
  }
}

function prepareDb(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL");
  migrate(db);
  db.exec(SCHEMA);
  return db;
}

function isCorrupt(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not a database|malformed|corrupt|encrypted/i.test(message);
}

/** Avoids a re-download: only a pre-`source` table has to be dropped. */
function migrate(db: DatabaseSync): void {
  const columns = db.prepare("PRAGMA table_info(entries)").all() as {
    name: string;
  }[];
  if (columns.length === 0) return;

  if (!columns.some((column) => column.name === "source")) {
    db.exec("DROP TABLE entries");
    db.exec("DELETE FROM meta"); // the counts described the dropped rows
    return;
  }

  db.exec(
    "DELETE FROM meta WHERE key LIKE 'oewn:%' OR key IN ('def:entries', 'ant:entries', 'wordnet:entries')",
  );

  const known = SOURCE_ORDER;
  const placeholders = known.map(() => "?").join(",");
  const retired = db
    .prepare(
      `SELECT DISTINCT source FROM entries WHERE source NOT IN (${placeholders})`,
    )
    .all(...known) as { source: string }[];
  for (const { source } of retired) {
    db.prepare("DELETE FROM entries WHERE source = ?").run(source);
    db.prepare("DELETE FROM meta WHERE key LIKE ?").run(`${source}:%`);
  }
  if (retired.length > 0) db.exec("VACUUM");
}

export function dbPath(dir: string): string {
  return join(dir, DB_NAME);
}

export function setMeta(db: DatabaseSync, key: string, value: string): void {
  db.prepare(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value);
}

export function getMeta(db: DatabaseSync, key: string): string | undefined {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as
    { value: string } | undefined;
  return row?.value;
}

export async function insertEntries(
  db: DatabaseSync,
  kind: Kind,
  source: Source,
  rows:
    | AsyncIterable<[headword: string, payload: string[]]>
    | Iterable<[headword: string, payload: string[]]>,
): Promise<number> {
  const insert = db.prepare(
    `INSERT INTO entries (headword, kind, source, payload) VALUES (?, ?, ?, ?)
       ON CONFLICT(headword, kind, source) DO UPDATE SET payload = excluded.payload`,
  );
  let count = 0;
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM entries WHERE kind = ? AND source = ?").run(
      kind,
      source,
    );
    for await (const [headword, payload] of rows) {
      insert.run(headword.toLowerCase(), kind, source, JSON.stringify(payload));
      count++;
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return count;
}

export type Entry = { value: string; source: Source };

const SUFFIXES = ["ings", "edly", "ing", "ies", "ied", "es", "ed", "ly", "s"];

/** Strips inflections only when the stem is really in the DB, so "bus" stays "bus". */
export function lookup(
  db: DatabaseSync,
  headword: string,
  kind: Kind,
): Entry[] {
  const query = headword.trim().toLowerCase();
  if (!query) return [];
  const select = db.prepare(
    "SELECT source, payload FROM entries WHERE headword = ? AND kind = ?",
  );
  const read = (word: string) =>
    select.all(word, kind) as { source: Source; payload: string }[];

  let rows = read(query);
  if (rows.length === 0) {
    outer: for (const suffix of SUFFIXES) {
      if (!query.endsWith(suffix) || query.length - suffix.length < 3) continue;
      const stem = query.slice(0, -suffix.length);
      for (const candidate of [
        stem,
        undoubleConsonant(stem),
        stem + "e",
        stem + "y",
      ]) {
        if (!candidate) continue;
        rows = read(candidate);
        if (rows.length > 0) break outer;
      }
    }
  }

  return rows
    .sort(
      (a, b) => SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source),
    )
    .flatMap(({ source, payload }) =>
      // a torn write survives the open but throws here, mid-render, where nothing
      // catches it: one bad row should cost its own results, not the command
      parsePayload(payload).map((value) => ({ value, source })),
    );
}

function parsePayload(payload: string): string[] {
  try {
    const values: unknown = JSON.parse(payload);
    return Array.isArray(values)
      ? values.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function undoubleConsonant(stem: string): string | undefined {
  const [last, previous] = [stem.at(-1), stem.at(-2)];
  return last && last === previous && !"aeiou".includes(last)
    ? stem.slice(0, -1)
    : undefined;
}

const INSTALL_LOCK = "offline.install.lock";
const heldLocks = new Map<string, DatabaseSync>();

export function installLockPath(dir: string): string {
  return join(dir, INSTALL_LOCK);
}

/**
 * Every command runs in its own process against one database, so two of them can start
 * an install at the same time — same file, same fixed staging table names. The winner
 * proceeds; the loser is told rather than left to collide over SQLite locks.
 *
 * Sibling of the database, not a row in it: deletion unlinks the db, and a lock that
 * lived there would vanish with the first `rm`. The holder is an open write
 * transaction: a crash drops it. Reclaiming leftover junk re-checks before moving
 * the file, and puts it back if the inode is already locked, so two reclaimers
 * cannot both delete a live replacement and create a second lock.
 */
export function acquireInstallLock(dir: string): boolean {
  const path = installLockPath(dir);
  if (heldLocks.has(path)) return false;
  try {
    return adoptLock(path);
  } catch (error) {
    if (isBusy(error)) return false;
    if (!isCorrupt(error)) throw error;
    return reclaimCorrupt(path);
  }
}

function adoptLock(path: string): boolean {
  heldLocks.set(path, beginLock(path));
  return true;
}

function tryAdopt(path: string): boolean {
  try {
    return adoptLock(path);
  } catch (error) {
    if (isBusy(error)) return false;
    throw error;
  }
}

function reclaimCorrupt(path: string): boolean {
  try {
    return adoptLock(path);
  } catch (error) {
    if (isBusy(error)) return false;
    if (!isCorrupt(error)) throw error;
  }

  const stale = `${path}.${process.pid}.stale`;
  try {
    renameSync(path, stale);
  } catch (move) {
    const code = (move as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return tryAdopt(path);
    if (code === "EBUSY" || code === "EPERM" || code === "EACCES") return false;
    throw move;
  }

  try {
    // Probe the inode we moved. Busy means we took a live lock off the
    // well-known path; put it back and give up.
    const db = beginLock(stale);
    db.close();
    try {
      renameSync(stale, path);
    } catch {
      rmSync(stale, { force: true });
    }
    return tryAdopt(path);
  } catch (error) {
    if (isBusy(error)) {
      try {
        renameSync(stale, path);
      } catch {
        /* the holder still has the inode */
      }
      return false;
    }
    if (!isCorrupt(error)) throw error;
    rmSync(stale, { force: true });
    return tryAdopt(path);
  }
}

function beginLock(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  try {
    db.exec("PRAGMA busy_timeout = 0");
    db.exec("BEGIN IMMEDIATE");
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

function isBusy(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /database is locked|database table is locked/i.test(message);
}

export function releaseInstallLock(dir: string): void {
  const path = installLockPath(dir);
  const db = heldLocks.get(path);
  if (!db) return;
  heldLocks.delete(path);
  db.close();
}
