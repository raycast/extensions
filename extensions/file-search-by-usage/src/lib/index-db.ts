import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * The on-disk search index.
 *
 * SQLite comes from `node:sqlite`, which Raycast's bundled Node 22.22.2 exposes
 * without a flag and compiles with FTS5 (verified: SQLite 3.51.2,
 * ENABLE_FTS5). That keeps a persistent in-process connection, so a query costs
 * no process spawn, and adds no dependency to package.json and nothing to
 * compile. `node:sqlite` is still marked experimental and prints one
 * ExperimentalWarning to stderr per process.
 *
 * The index stays on disk. Queries are bounded by LIMIT, the page cache is
 * capped, and no code path reads the whole table into JavaScript.
 *
 * WAL is required rather than a preference: a reader takes a consistent snapshot
 * and does not block while a rebuild holds a write transaction, which is what
 * lets search keep working during a refresh.
 */

/** Current schema. Bump when the shape changes; older files are rebuilt. */
export const SCHEMA_VERSION = 1;

/** Page cache ceiling in kibibytes, negative per the SQLite pragma. */
const CACHE_KIB = 8_000;

export type FileRow = {
  path: string;
  name: string;
  parent: string;
  root: string;
  is_dir: number;
  is_symlink: number;
  size: number;
  mtime_ms: number;
  birthtime_ms: number;
  storage_path: string | null;
};

/** One indexed root and the outcome of the scan that produced it. */
export type IndexRoot = {
  root: string;
  scannedAt: number;
  /** True when the scan covered the whole root and stale rows were removed. */
  complete: number;
  files: number;
  note: string | null;
};

/**
 * Where the index lives, given Raycast's support directory.
 *
 * The support path is passed in rather than read here: this module is exercised
 * by the harness, which runs outside Raycast and has no `environment`.
 */
export function indexDatabasePath(supportPath: string) {
  return path.join(supportPath, "file-index.sqlite");
}

/** Every file SQLite may create for this database. */
function databaseFiles(file: string) {
  return [file, `${file}-wal`, `${file}-shm`];
}

/** Kept apart from the schema so a bulk scan can drop and restore them. */
const FTS_TRIGGERS = `
CREATE TRIGGER IF NOT EXISTS files_fts_insert AFTER INSERT ON files BEGIN
  INSERT INTO files_fts(rowid, name) VALUES (new.id, new.name);
END;
CREATE TRIGGER IF NOT EXISTS files_fts_delete AFTER DELETE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, name) VALUES('delete', old.id, old.name);
END;
CREATE TRIGGER IF NOT EXISTS files_fts_update AFTER UPDATE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, name) VALUES('delete', old.id, old.name);
  INSERT INTO files_fts(rowid, name) VALUES (new.id, new.name);
END;
`;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS files (
  id            INTEGER PRIMARY KEY,
  path          TEXT NOT NULL,
  name          TEXT NOT NULL,
  parent        TEXT NOT NULL,
  root          TEXT NOT NULL,
  is_dir        INTEGER NOT NULL,
  is_symlink    INTEGER NOT NULL,
  size          INTEGER NOT NULL,
  mtime_ms      INTEGER NOT NULL,
  birthtime_ms  INTEGER NOT NULL,
  storage_path  TEXT,
  scan_id       INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS files_path ON files(path);
CREATE INDEX IF NOT EXISTS files_parent ON files(parent);
CREATE INDEX IF NOT EXISTS files_root_scan ON files(root, scan_id);

/*
 * External-content FTS: the index stores terms only and reads column values
 * back from the files table. That is what keeps the FTS data near 18 MiB
 * against a ~360 MiB table for roughly 479k paths.
 */
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
  name,
  content='files',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2',
  prefix='2 3 4'
);

${FTS_TRIGGERS}

CREATE TABLE IF NOT EXISTS index_roots (
  root       TEXT PRIMARY KEY,
  scanned_at INTEGER NOT NULL,
  complete   INTEGER NOT NULL,
  files      INTEGER NOT NULL,
  note       TEXT
);

CREATE TABLE IF NOT EXISTS index_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

function applyPragmas(db: DatabaseSync, readOnly: boolean) {
  // A stale lock from a killed process must not fail a query outright.
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(`PRAGMA cache_size = -${CACHE_KIB}`);
  if (readOnly) return;
  db.exec("PRAGMA journal_mode = WAL");
  // WAL keeps durability across process loss at NORMAL; only a machine crash
  // can lose the last commits, and the answer to that is to scan again.
  db.exec("PRAGMA synchronous = NORMAL");
}

/** True when the error means the file is not a usable database. */
function isCorruption(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not a database|malformed|corrupt|encrypted/iu.test(message);
}

export type OpenResult =
  | { kind: "opened"; db: DatabaseSync }
  | { kind: "missing" }
  | { kind: "failed"; error: string };

/**
 * Open for writing, creating or rebuilding the schema as needed.
 *
 * A file whose schema predates this build, or which will not open at all, is
 * discarded and recreated: it holds only derived data, so rebuilding costs a
 * scan and never loses anything the user typed.
 */
export function openIndexForWrite(file: string, attempt = 0): OpenResult {
  let db: DatabaseSync | undefined;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const existed = fs.existsSync(file);
    db = new DatabaseSync(file);
    applyPragmas(db, false);

    const version = Number(
      (db.prepare("PRAGMA user_version").get() as { user_version?: number })
        ?.user_version ?? 0,
    );
    if (existed && version !== 0 && version !== SCHEMA_VERSION) {
      db.close();
      db = undefined;
      return rebuild(file, attempt);
    }
    db.exec(SCHEMA);
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    // A scan that was killed before it could finish leaves the FTS index
    // describing the previous contents. Put it right before anyone reads it.
    if (ftsSuspended(db)) resumeFtsSync(db);
    return { kind: "opened", db };
  } catch (error) {
    try {
      db?.close();
    } catch {
      /* Closing a database that failed to open is not itself an error. */
    }
    if (isCorruption(error) && attempt === 0) return rebuild(file, attempt);
    return {
      kind: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function rebuild(file: string, attempt: number): OpenResult {
  if (attempt > 0)
    return { kind: "failed", error: "The search index could not be rebuilt." };
  try {
    for (const part of databaseFiles(file)) fs.rmSync(part, { force: true });
  } catch (error) {
    return {
      kind: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
  return openIndexForWrite(file, attempt + 1);
}

/**
 * Open for reading. Missing is an ordinary state, not an error: search falls
 * back to memory-only results until the index has been built once.
 */
export function openIndexForRead(file: string): OpenResult {
  if (!fs.existsSync(file)) return { kind: "missing" };
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    applyPragmas(db, true);
    const version = Number(
      (db.prepare("PRAGMA user_version").get() as { user_version?: number })
        ?.user_version ?? 0,
    );
    if (version !== SCHEMA_VERSION) {
      db.close();
      // A rebuild needs a writer; reporting missing keeps search working.
      return { kind: "missing" };
    }
    return { kind: "opened", db };
  } catch (error) {
    try {
      db?.close();
    } catch {
      /* Preserve the error that prevented reading. */
    }
    if (isCorruption(error)) return { kind: "missing" };
    return {
      kind: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function readIndexRoots(db: DatabaseSync): IndexRoot[] {
  return db
    .prepare(
      "SELECT root, scanned_at AS scannedAt, complete, files, note FROM index_roots ORDER BY root",
    )
    .all() as unknown as IndexRoot[];
}

export function countIndexedFiles(db: DatabaseSync): number {
  const row = db.prepare("SELECT count(*) AS n FROM files").get() as {
    n: number;
  };
  return Number(row?.n ?? 0);
}

/**
 * Turn off row-by-row FTS maintenance for a bulk scan.
 *
 * Every insert otherwise fires a trigger that writes the name into the FTS
 * index. Measured over 200,000 rows: 8.7s with the triggers against 4.6s
 * without, plus 0.4s to rebuild the whole FTS index afterwards. Inserting is
 * the largest single cost in a scan, so this is worth the two states.
 *
 * While suspended the FTS index describes the previous contents. A search
 * still runs and still returns rows, because the index only supplies row ids
 * and the values come from `files`. What it cannot do is find a file added
 * during the scan, and a file renamed during the scan can still be found under
 * its old name until the rebuild. `resumeFtsSync` must therefore run even if
 * the scan fails, which is why the caller puts it in a finally block.
 */
export function suspendFtsSync(db: DatabaseSync): void {
  // Recorded so a process killed mid-scan is detected on the next open. The
  // triggers themselves come back with the schema, but the FTS index would
  // still describe the old contents, and nothing else would notice.
  db.exec(
    "INSERT INTO index_meta (key, value) VALUES ('fts_suspended', '1') " +
      "ON CONFLICT(key) DO UPDATE SET value = '1';" +
      "DROP TRIGGER IF EXISTS files_fts_insert;" +
      "DROP TRIGGER IF EXISTS files_fts_delete;" +
      "DROP TRIGGER IF EXISTS files_fts_update;",
  );
}

/** Restore the triggers and bring the FTS index back in line with `files`. */
export function resumeFtsSync(db: DatabaseSync): void {
  db.exec(FTS_TRIGGERS);
  db.exec("INSERT INTO files_fts(files_fts) VALUES('rebuild')");
  db.exec("DELETE FROM index_meta WHERE key = 'fts_suspended'");
}

/** True when a scan suspended FTS maintenance and never finished. */
export function ftsSuspended(db: DatabaseSync): boolean {
  try {
    return (
      db
        .prepare("SELECT 1 FROM index_meta WHERE key = 'fts_suspended'")
        .get() !== undefined
    );
  } catch {
    return false;
  }
}

export type IndexStats = {
  bytes: number;
  entries: number;
  files: number;
  directories: number;
  symlinks: number;
  lastDurationMs?: number;
};

/** Counts for the settings screen. One grouped scan of the table. */
export function readIndexStats(db: DatabaseSync, file: string): IndexStats {
  const rows = db
    .prepare(
      `SELECT is_dir AS isDir, is_symlink AS isSymlink, count(*) AS n
       FROM files GROUP BY is_dir, is_symlink`,
    )
    .all() as { isDir: number; isSymlink: number; n: number }[];

  let entries = 0;
  let files = 0;
  let directories = 0;
  let symlinks = 0;
  for (const row of rows) {
    entries += row.n;
    // A link is counted as a link, not also as whatever it points at.
    if (row.isSymlink) symlinks += row.n;
    else if (row.isDir) directories += row.n;
    else files += row.n;
  }

  let bytes = 0;
  for (const part of databaseFiles(file)) {
    try {
      bytes += fs.statSync(part).size;
    } catch {
      continue;
    }
  }

  const duration = db
    .prepare("SELECT value FROM index_meta WHERE key = 'last_duration_ms'")
    .get() as { value: string } | undefined;
  const lastDurationMs = duration ? Number.parseInt(duration.value, 10) : NaN;

  return {
    bytes,
    entries,
    files,
    directories,
    symlinks,
    lastDurationMs: Number.isFinite(lastDurationMs)
      ? lastDurationMs
      : undefined,
  };
}

/** Record how long the last scan took, for the stats screen. */
export function writeLastDuration(db: DatabaseSync, elapsedMs: number): void {
  db.prepare(
    "INSERT INTO index_meta (key, value) VALUES ('last_duration_ms', ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(String(Math.max(0, Math.round(elapsedMs))));
}

/** Remove only the derived index files, under the caller's indexing lock. */
export function deleteIndexDatabase(file: string): number {
  let bytes = 0;
  for (const part of databaseFiles(file)) {
    try {
      const size = fs.statSync(part).size;
      fs.rmSync(part, { force: true });
      bytes += size;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw new Error(`Could not delete index file ${part}`, { cause: error });
    }
  }
  return bytes;
}
