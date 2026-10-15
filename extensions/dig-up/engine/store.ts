// The on-disk index (DigUp: IndexStore.swift + Database.swift) on node:sqlite: files, their segments with fp16
// vectors, and an FTS5 table, in one SQLite file. Vectors live beside the rows that describe them, so a crash never
// leaves them out of step; at this scale brute-force search over an in-memory copy needs no vector database.

import { randomUUID } from "node:crypto";
import { mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";
import { DatabaseSync, type SQLInputValue, type SQLOutputValue, type StatementSync } from "node:sqlite";
import type { FileListItem } from "./api";
import { packHalves } from "./f16";
import { FolderSelection, lastPathComponent, parentPath } from "./rules";
import { Graphemes, graphemeCount, hasPrefix, normalized } from "./searchtext";
import { INDEXING_ORDER_SQL, type FileKind, type FileState, type Modality, type SegmentKind } from "./types";

/**
 * An inode or device number, as the index keeps it: the 64 bits as a signed integer (DigUp: `Int64(bitPattern:)`; the
 * helper reports them signed too). File ids on SMB and NTFS volumes pass 2^53, so it can be a bigint (`fileNumber`).
 */
export type FileNumber = number | bigint;

/** The one form a file number comes back in: a number when a double holds it exactly, else a bigint. So `===` and
 *  `${device}:${inode}` keys match, also for a number the helper's JSON rounded and what was stored from it. */
export function fileNumber(value: FileNumber): FileNumber {
  if (typeof value === "number") return value;
  const exact = Number(value);
  return BigInt(exact) === value ? exact : value;
}

/** A file the crawler decided to index (DigUp: Candidate). */
export interface Candidate {
  path: string;
  kind: FileKind;
  size: number;
  /** Seconds since 1970. */
  mtime: number;
  inode: FileNumber;
  device: FileNumber;
}

/** A file as the index knows it (DigUp: FileRecord). */
export interface FileRecord extends Candidate {
  id: number;
  state: FileState;
}

export interface SegmentInput {
  file: number;
  kind: SegmentKind;
  modality: Modality;
  /** PDF page or chunk (from 1), start second, or first line or cell. */
  loc?: number | null;
  locEnd?: number | null;
  excerpt?: string | null;
  /** Goes into keyword search (normalized); nothing when empty. */
  text?: string | null;
  /** 768 floats, L2-normalized; stored as halves. Without one the segment's modality is "none". */
  vector?: ArrayLike<number> | null;
}

export interface StoreCounts {
  /** kind → state → files. */
  byKindAndState: Record<string, Record<string, number>>;
  vectors: number;
  /** Segments other than names. */
  segments: number;
  /** Long files still being read, and their pages and chunks left. */
  unfinished: number;
  left: number;
}

export type Row = Record<string, SQLOutputValue>;

const SCHEMA_VERSION = 5;

/** Marks (M*) count as letters, so Bengali vowel signs and Arabic harakat stay inside their words. */
export const TOKENIZER = "porter unicode61 remove_diacritics 2 categories 'L* N* Co M*'";
/** Words are matched in `body`, normalized; `original` keeps the text as written when normalizing changed it. */
const FTS_COLUMNS = `name, body, original UNINDEXED, tokenize = "${TOKENIZER}"`;

// DigUp: IndexStore.create (schema 5), verbatim.
const CREATE_SQL = `
CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE files(
    id INTEGER PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL,
    size INTEGER NOT NULL,
    mtime REAL NOT NULL,
    inode INTEGER NOT NULL,
    device INTEGER NOT NULL,
    state TEXT NOT NULL DEFAULT 'pending',   -- pending | done | partial | skipped | failed
    detail TEXT,                              -- why skipped/failed, or how far a long file has been read
    info TEXT,                                -- JSON: pixels, pages, duration, date taken; read_to/read_end
    indexed_at REAL
);
CREATE INDEX files_inode ON files(device, inode);
CREATE INDEX files_state ON files(state, kind);
CREATE TABLE segments(
    id INTEGER PRIMARY KEY,
    file INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,       -- SegmentKind
    modality TEXT NOT NULL,   -- Modality of the vector ('none' when there is no vector)
    loc REAL,                 -- PDF page number, or start second for audio/video
    loc_end REAL,
    excerpt TEXT,
    vec BLOB                  -- 768 × float16, L2-normalized
);
CREATE INDEX segments_file ON segments(file);
CREATE VIRTUAL TABLE fts USING fts5(${FTS_COLUMNS});
PRAGMA user_version = ${SCHEMA_VERSION};
`;

const FILE_COLUMNS = "id, path, kind, size, mtime, inode, device, state";

const SQLITE_BUSY = 5;

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isBusy(error: unknown): boolean {
  const code = (error as { errcode?: unknown }).errcode;
  return typeof code === "number" && (code & 0xff) === SQLITE_BUSY;
}

const NON_ASCII = /[\u0080-￿]/;
const canonical = (path: string) => (NON_ASCII.test(path) ? path.normalize("NFC") : path);

/** Swift's `path.hasPrefix(prefix)`: by Characters, under canonical equivalence. */
function startsWith(path: string, prefix: string): boolean {
  return hasPrefix(canonical(path), canonical(prefix));
}

/** Swift's `==` on strings: canonical equivalence. */
function sameText(a: string, b: string): boolean {
  return a === b || a.normalize("NFC") === b.normalize("NFC");
}

const num = (value: SQLOutputValue): number => (value === null ? 0 : Number(value));
const str = (value: SQLOutputValue): string | null => (value === null ? null : String(value));

/** As a 64-bit integer: node:sqlite binds a number past 2^53 as a double, which SQLite keeps as a REAL past 2^63.
 *  An unsigned value past 2^63 goes in as its bits, signed, as DigUp stores it. */
function bindFileNumber(value: FileNumber): FileNumber {
  return Number.isSafeInteger(value) ? value : BigInt.asIntN(64, BigInt(value));
}

const readFileNumber = (value: SQLOutputValue): FileNumber =>
  typeof value === "bigint" ? fileNumber(value) : num(value);

/** A row of FILE_COLUMNS, read by a statement that reads integers as bigints (`fileStatement`). */
function fileRecord(row: Row): FileRecord {
  return {
    id: num(row.id),
    path: str(row.path) ?? "",
    kind: (str(row.kind) ?? "doc") as FileKind,
    size: num(row.size),
    mtime: num(row.mtime),
    inode: readFileNumber(row.inode),
    device: readFileNumber(row.device),
    state: (str(row.state) ?? "pending") as FileState,
  };
}

/** A transaction's body can't return a promise: what it writes after an `await` would come after the COMMIT, and a
 *  later throw would roll nothing back. */
type NotThenable<T> = T extends PromiseLike<unknown> ? never : T;

/** The same at run time, for a body that got past the type check. */
function synchronous<T>(result: T): T {
  if (typeof (result as { then?: unknown } | null | undefined)?.then === "function") {
    throw new TypeError("a transaction's body can't be async: what it writes after an await would be outside it");
  }
  return result;
}

/** `info` as DigUp reads it: an object of strings, or nothing at all (Swift's `as? [String: String]`). */
export function parseInfo(json: string | null): Record<string, string> {
  if (json === null) return {};
  try {
    const value: unknown = JSON.parse(json);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    const entries = Object.entries(value);
    if (!entries.every(([, v]) => typeof v === "string")) return {};
    return Object.fromEntries(entries) as Record<string, string>;
  } catch {
    return {};
  }
}

/** JSON with sorted keys, as DigUp writes `info`; null for an empty one. */
export function infoJSON(info: Record<string, string>): string | null {
  const keys = Object.keys(info).sort();
  if (keys.length === 0) return null;
  return JSON.stringify(Object.fromEntries(keys.map((key) => [key, info[key]])));
}

export class Store {
  /** Distinguishes reused SQLite row ids after the database is reopened or replaced. */
  readonly previewSession = randomUUID();
  private lastIndexedAt = 0;
  readonly db: DatabaseSync;
  private readonly statements = new Map<string, StatementSync>();
  /** Statements that read integers as bigints: the file rows, whose inode and device may pass 2^53. */
  private readonly fileStatements = new Map<string, StatementSync>();
  private depth = 0;
  private closed = false;
  private scopeSQL = "";
  private scopeValues: string[] = [];
  private scopeFolders: string[] | null = null;

  private constructor(
    /** The SQLite file. */
    readonly file: string,
    /** The code index (`code.sqlite`): names are looked up as names when searching it. */
    readonly code: boolean,
    /** The folder that `folderText` makes paths relative to. */
    private readonly home: string,
  ) {
    mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    try {
      this.db.exec("PRAGMA busy_timeout = 5000");
      // Two processes opening a new index at once: the switch to WAL can fail at once with "database is locked"
      // rather than wait (SQLite's rule against deadlocks), so it's tried again for up to five seconds (DigUp:
      // Database.swift).
      for (let tries = 0; ; tries++) {
        try {
          this.db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;");
          break;
        } catch (error) {
          if (!isBusy(error) || tries >= 50) throw error;
          sleepSync(100);
        }
      }
      try {
        this.db.exec("CREATE VIRTUAL TABLE temp.fts5_probe USING fts5(a); DROP TABLE temp.fts5_probe;");
      } catch {
        throw new Error(
          `SQLite in Node ${process.version} has no full-text search (FTS5); Dig Up needs Raycast's Node 22.23 or newer`,
        );
      }
      this.migrate();
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  /** Opens (and creates, when new) an index file; its folder is made if missing. */
  static open(file: string, o: { code: boolean; home?: string }): Store {
    return new Store(file, o.code, o.home ?? homedir());
  }

  /** Bytes on disk: the database and its write-ahead log. */
  static size(file: string): number {
    let total = 0;
    for (const path of [file, file + "-wal"]) {
      try {
        total += statSync(path).size;
      } catch {
        // not there
      }
    }
    return total;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.statements.clear();
    this.fileStatements.clear();
    this.db.close();
  }

  // MARK: SQL

  /** A prepared statement, kept for the next call with the same SQL. */
  statement(sql: string): StatementSync {
    return this.cached(this.statements, sql, false);
  }

  private fileStatement(sql: string): StatementSync {
    return this.cached(this.fileStatements, sql, true);
  }

  private cached(cache: Map<string, StatementSync>, sql: string, readBigInts: boolean): StatementSync {
    let statement = cache.get(sql);
    if (!statement) {
      if (cache.size >= 256) cache.clear();
      statement = this.db.prepare(sql);
      if (readBigInts) statement.setReadBigInts(true);
      cache.set(sql, statement);
    }
    return statement;
  }

  all(sql: string, ...values: SQLInputValue[]): Row[] {
    return this.statement(sql).all(...values);
  }

  get(sql: string, ...values: SQLInputValue[]): Row | undefined {
    return this.statement(sql).get(...values);
  }

  /** Rows one at a time, for queries that can return many. */
  iterate(sql: string, ...values: SQLInputValue[]): Iterable<Row> {
    return this.statement(sql).iterate(...values) as Iterable<Row>;
  }

  /** Runs a write; returns the new rowid. */
  run(sql: string, ...values: SQLInputValue[]): number {
    return Number(this.statement(sql).run(...values).lastInsertRowid);
  }

  /** `BEGIN IMMEDIATE … COMMIT`, rolled back on a throw. A transaction inside another one joins it (DigUp never
   *  nests them; here `prune` and `resetAll` may run inside a caller's). The body is synchronous, as Swift's is: an
   *  async one is refused and what it wrote before its first `await` rolled back. */
  transaction<T>(body: () => NotThenable<T>): T {
    if (this.depth > 0) {
      this.depth++;
      try {
        return synchronous(body());
      } finally {
        this.depth--;
      }
    }
    this.db.exec("BEGIN IMMEDIATE");
    this.depth = 1;
    try {
      const result = synchronous(body());
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
        // SQLite may have rolled back already
      }
      throw error;
    } finally {
      this.depth = 0;
    }
  }

  private migrate(): void {
    const version = () => num(this.get("PRAGMA user_version")?.user_version ?? 0);
    const found = version();
    if (found > SCHEMA_VERSION) throw new Error(`this index was made by a newer Dig Up (schema ${found})`);
    if (found === SCHEMA_VERSION) return;
    // Another process may be creating it at the same moment: wait for it (up to a minute), then see it done.
    this.db.exec("PRAGMA busy_timeout = 60000");
    try {
      this.transaction(() => {
        const now = version();
        if (now === 0) this.db.exec(CREATE_SQL);
        // DigUp's schemas 1-4 can't be here: this index is never DigUp.app's own file.
        else if (now < SCHEMA_VERSION) throw new Error(`this index has an old schema (${now}) that Dig Up can't read`);
      });
    } finally {
      this.db.exec("PRAGMA busy_timeout = 5000");
    }
  }

  // MARK: Meta

  meta(key: string): string | null {
    return str(this.get("SELECT value FROM meta WHERE key = ?", key)?.value ?? null);
  }

  setMeta(key: string, value: string | null): void {
    if (value === null) {
      this.run("DELETE FROM meta WHERE key = ?", key);
    } else {
      this.run(
        "INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        key,
        value,
      );
    }
  }

  /** "<vector source> | <options fingerprint>" of the model and settings the vectors came from. */
  fingerprint(): string | null {
    return this.meta("fingerprint");
  }

  /** Which model made the vectors: meaning search needs the query encoder to be the same. */
  vectorSource(): string | null {
    return this.meta("vector_source");
  }

  /** Records the model and settings of the vectors to come (when the first embedder starts). */
  setModel(fingerprint: string, vectorSource: string): void {
    this.setMeta("fingerprint", fingerprint);
    this.setMeta("vector_source", vectorSource);
  }

  // MARK: Scope

  /** When set, `pending`, `pendingCount`, `unfinished` and `counts` see only files under these folders: the folders
   *  connected right now, so files on an unplugged drive neither fail nor count as waiting. */
  get scope(): string[] | null {
    return this.scopeFolders;
  }

  set scope(folders: string[] | null) {
    this.scopeFolders = folders === null ? null : [...folders];
    if (folders === null) {
      this.scopeSQL = "";
      this.scopeValues = [];
      return;
    }
    const ranges = folders.flatMap(Store.pathRanges);
    this.scopeSQL =
      ranges.length === 0 ? " AND 0" : " AND (" + ranges.map(() => "(path >= ? AND path < ?)").join(" OR ") + ")";
    this.scopeValues = ranges.flatMap((range) => [range.from, range.to]);
  }

  /**
   * The ranges of the UNIQUE path index that hold the files under `folder`. Paths are stored as a walk reports them,
   * which isn't always how the folder is spelled (/var for /private/var, a decomposed name the disk keeps
   * precomposed); SQLite compares bytes. So: a range for the folder as given, and one for its real path when that's
   * spelled differently.
   */
  static pathRanges(folder: string): Array<{ from: string; to: string }> {
    const spellings = [folder];
    const real = FolderSelection.realPath(folder);
    if (real !== folder) spellings.push(real);
    return spellings.map((path) => {
      const prefix = path.endsWith("/") ? path : path + "/";
      return { from: prefix, to: prefix + "\u{10FFFF}" };
    });
  }

  // MARK: Files

  /** Every file under one of `roots`, each once. */
  files(under: readonly string[]): FileRecord[] {
    const out: FileRecord[] = [];
    const seen = new Set<number>(); // also where two spellings of a folder meet
    const inRange = this.fileStatement(`SELECT ${FILE_COLUMNS} FROM files WHERE path >= ? AND path < ?`);
    for (const root of under) {
      // A folder inside another one listed is already covered.
      if (under.some((other) => FolderSelection.isInside(root, other))) continue;
      for (const range of Store.pathRanges(root)) {
        for (const row of inRange.iterate(range.from, range.to) as Iterable<Row>) {
          const record = fileRecord(row);
          if (seen.has(record.id)) continue;
          seen.add(record.id);
          out.push(record);
        }
      }
    }
    return out;
  }

  /** The file at `path`, if the index has it. */
  fileAt(path: string): FileRecord | null {
    const row = this.fileStatement(`SELECT ${FILE_COLUMNS} FROM files WHERE path = ?`).get(path);
    return row ? fileRecord(row) : null;
  }

  /** Files by state and kind, by path, for lists of what was skipped or failed (`POST /files`; DigUp has no such
   *  list). Only files in `scope`, as `counts` counts them. An empty `states` or `kinds` matches nothing. */
  list(
    o: { states?: readonly FileState[] | null; kinds?: readonly FileKind[] | null; limit?: number | null } = {},
  ): FileListItem[] {
    let filter = "";
    const values: string[] = [];
    for (const [column, wanted] of [
      ["state", o.states],
      ["kind", o.kinds],
    ] as const) {
      if (wanted == null) continue;
      filter += ` AND ${column} IN (${wanted.map(() => "?").join(", ")})`;
      values.push(...wanted);
    }
    return this.all(
      `SELECT path, kind, state, detail FROM files WHERE 1${filter}${this.scopeSQL} ORDER BY path LIMIT ?`,
      ...values,
      ...this.scopeValues,
      o.limit ?? -1,
    ).map((row) => ({
      path: str(row.path) ?? "",
      kind: (str(row.kind) ?? "doc") as FileKind,
      state: (str(row.state) ?? "pending") as FileState,
      detail: str(row.detail),
    }));
  }

  /** Adds a file (pending), with its name in keyword search, and returns its id. */
  insert(file: Candidate): number {
    const id = this.run(
      "INSERT INTO files(path, kind, size, mtime, inode, device) VALUES(?, ?, ?, ?, ?, ?)",
      file.path,
      file.kind,
      file.size,
      file.mtime,
      bindFileNumber(file.inode),
      bindFileNumber(file.device),
    );
    this.addNameRow(id, file.path);
    return id;
  }

  /** Drops what was extracted from a file and queues it again: changed on disk (`as` its new facts), or to be read
   *  again as it is. */
  requeue(id: number, as?: Candidate): void {
    this.deleteSegments(id, true);
    if (as) {
      this.run(
        "UPDATE files SET kind = ?, size = ?, mtime = ?, inode = ?, device = ?, state = 'pending', detail = NULL, " +
          "info = NULL, indexed_at = NULL WHERE id = ?",
        as.kind,
        as.size,
        as.mtime,
        bindFileNumber(as.inode),
        bindFileNumber(as.device),
        id,
      );
    } else {
      this.run("UPDATE files SET state = 'pending', detail = NULL, info = NULL, indexed_at = NULL WHERE id = ?", id);
    }
  }

  /** Same inode, size and date at a new path: a move or rename. Only the path changes; nothing is embedded again. */
  move(id: number, path: string): void {
    this.run("UPDATE files SET path = ? WHERE id = ?", path, id);
    this.run(
      "UPDATE fts SET name = ?, body = ? WHERE rowid IN (SELECT id FROM segments WHERE file = ? AND kind = 'name')",
      normalized(Store.nameText(path)),
      normalized(Store.folderText(path, this.home)),
      id,
    );
  }

  /** Removes a file: its keyword rows first (nothing links them to segments), then the file and its segments. */
  delete(id: number): void {
    this.run("DELETE FROM fts WHERE rowid IN (SELECT id FROM segments WHERE file = ?)", id);
    this.run("DELETE FROM files WHERE id = ?", id);
  }

  /** Removes every file that isn't under one of `roots` (folders taken out). Returns how many went. */
  prune(keepingUnder: readonly string[]): number {
    const prefixes = keepingUnder.flatMap((root) => Store.pathRanges(root).map((range) => range.from));
    const gone: number[] = [];
    for (const row of this.iterate("SELECT id, path FROM files")) {
      const path = str(row.path) ?? "";
      if (!prefixes.some((prefix) => startsWith(path, prefix))) gone.push(num(row.id));
    }
    if (gone.length === 0) return 0;
    this.transaction(() => {
      for (const id of gone) this.delete(id);
    });
    return gone.length;
  }

  /** Queues every file again and forgets the fingerprint (the model or settings changed). Files and their names
   *  stay, so search by name keeps working. */
  resetAll(): void {
    this.transaction(() => {
      this.run("DELETE FROM fts WHERE rowid IN (SELECT id FROM segments WHERE kind != 'name')");
      this.run("DELETE FROM segments WHERE kind != 'name'");
      this.run("UPDATE files SET state = 'pending', detail = NULL, info = NULL, indexed_at = NULL");
      this.setMeta("fingerprint", null);
    });
  }

  /** Files waiting to be embedded, in indexing order (screenshots first, newest first); `onlyIds` narrows it to
   *  some files (just-added ones). */
  pending(limit: number | null = null, onlyIds: Iterable<number> | null = null): FileRecord[] {
    let filter = "";
    if (onlyIds !== null) {
      const ids = [...onlyIds].map((id) => Math.trunc(id));
      if (ids.length === 0) return [];
      filter = ` AND id IN (${ids.join(",")})`;
    }
    const sql =
      `SELECT ${FILE_COLUMNS} FROM files WHERE state = 'pending'${filter}${this.scopeSQL} ` +
      `ORDER BY ${INDEXING_ORDER_SQL}, mtime DESC LIMIT ?`;
    // Each list of ids is its own SQL: not kept.
    const statement = filter === "" ? this.fileStatement(sql) : this.db.prepare(sql);
    if (filter !== "") statement.setReadBigInts(true);
    return statement.all(...this.scopeValues, limit ?? -1).map(fileRecord);
  }

  pendingCount(): number {
    return num(
      this.get(`SELECT COUNT(*) AS n FROM files WHERE state = 'pending'${this.scopeSQL}`, ...this.scopeValues)?.n ?? 0,
    );
  }

  /** Long files with pages or chunks still to read after their first step, in indexing order. */
  unfinished(): FileRecord[] {
    return this.fileStatement(
      `SELECT ${FILE_COLUMNS} FROM files WHERE state = 'partial'${this.scopeSQL} ORDER BY ${INDEXING_ORDER_SQL}, mtime DESC`,
    )
      .all(...this.scopeValues)
      .map(fileRecord);
  }

  /** How many long files are unfinished, and how many of their pages and chunks are left to read. */
  unfinishedCount(): { files: number; left: number } {
    const row = this.get(
      "SELECT COUNT(*) AS files, SUM(MAX(0, CAST(json_extract(info, '$.read_end') AS INTEGER) " +
        `- CAST(json_extract(info, '$.read_to') AS INTEGER))) AS left FROM files WHERE state = 'partial'${this.scopeSQL}`,
      ...this.scopeValues,
    );
    return { files: num(row?.files ?? 0), left: num(row?.left ?? 0) };
  }

  /** What indexing learned about a file (all values are strings). */
  info(id: number): Record<string, string> {
    return parseInfo(str(this.get("SELECT info FROM files WHERE id = ?", id)?.info ?? null));
  }

  /** Replaces a file's info only. */
  setInfo(id: number, info: Record<string, string>): void {
    this.run("UPDATE files SET info = ? WHERE id = ?", infoJSON(info), id);
  }

  /** A file's outcome: its state, why (or how far a long file got), what was learned, and when (DigUp: finish). */
  finish(id: number, state: FileState, detail: string | null = null, info: Record<string, string> = {}): void {
    // Keep consecutive rewrites distinct even when they finish in the same millisecond.
    this.lastIndexedAt = Math.max(Date.now() / 1000, this.lastIndexedAt + 0.000001);
    this.run(
      "UPDATE files SET state = ?, detail = ?, info = ?, indexed_at = ? WHERE id = ?",
      state,
      detail,
      infoJSON(info),
      this.lastIndexedAt,
      id,
    );
  }

  /** `finish` by another name. */
  setState(id: number, state: FileState, detail: string | null = null, info: Record<string, string> = {}): void {
    this.finish(id, state, detail, info);
  }

  /** A file the helper had to stop on (reading it ran away): it isn't read again until it changes. A long file that
   *  was being finished keeps what was read of it. False when no file has that path. */
  markStopped(path: string, why: string): boolean {
    const row = this.get("SELECT id, state FROM files WHERE path = ?", path);
    if (!row) return false;
    if (str(row.state) === "partial") this.finish(num(row.id), "done", `The rest couldn't be read: it ${why}`);
    else this.finish(num(row.id), "failed", `It ${why}`);
    return true;
  }

  /**
   * Files read once more because they're read better now, each kind once per index: PDFs with pages read as pictures
   * (`ocr`: their words come from OCR now; meta "scans_ocr") and pictures skipped as unreadable (`drawsVectorPictures`:
   * SVGs are drawn now; meta "pictures_drawn"). Returns how many files.
   */
  readAgainOnce(o: { ocr: boolean; drawsVectorPictures: boolean }): number {
    const files = new Set<number>();
    const flags: string[] = [];
    if (o.ocr && this.meta("scans_ocr") === null) {
      for (const row of this.iterate("SELECT DISTINCT file FROM segments WHERE kind = 'page_image'"))
        files.add(num(row.file));
      flags.push("scans_ocr");
    }
    if (o.drawsVectorPictures && this.meta("pictures_drawn") === null) {
      const skipped = "SELECT id FROM files WHERE kind = 'image' AND state = 'skipped' AND detail = ?";
      for (const row of this.iterate(skipped, "small image 0×0")) files.add(num(row.id));
      flags.push("pictures_drawn");
    }
    if (flags.length === 0) return 0;
    this.transaction(() => {
      for (const file of files) this.requeue(file);
      for (const flag of flags) this.setMeta(flag, "1");
    });
    return files.size;
  }

  // MARK: Segments

  /** Adds a segment and returns its id: `text` goes into keyword search (normalized), `vector` into meaning search. */
  addSegment(segment: SegmentInput): number {
    const vector = segment.vector ?? null;
    const id = this.run(
      "INSERT INTO segments(file, kind, modality, loc, loc_end, excerpt, vec) VALUES(?, ?, ?, ?, ?, ?, ?)",
      segment.file,
      segment.kind,
      vector === null ? "none" : segment.modality,
      segment.loc ?? null,
      segment.locEnd ?? null,
      segment.excerpt ?? null,
      vector === null ? null : packHalves(vector),
    );
    const text = segment.text ?? "";
    if (text !== "") {
      const [body, original] = Store.keywordText(text);
      this.run("INSERT INTO fts(rowid, name, body, original) VALUES(?, '', ?, ?)", id, body, original);
    }
    return id;
  }

  /** The last page or chunk stored for a file (where a long file's reading got to, when its info doesn't say). */
  lastPlace(id: number): number | null {
    const row = this.get(
      "SELECT MAX(loc) AS last FROM segments WHERE file = ? AND kind IN ('page', 'page_image', 'chunk')",
      id,
    );
    return row?.last == null ? null : Math.trunc(num(row.last));
  }

  /** `body` and `original` for keyword search: the normalized text, and the text as written if that differs (as
   *  Swift compares: decomposed text that normalizing only composed is the same text). */
  static keywordText(text: string): [body: string, original: string | null] {
    const body = normalized(text);
    return [body, sameText(body, text) ? null : text];
  }

  private addNameRow(file: number, path: string): void {
    const id = this.run("INSERT INTO segments(file, kind, modality) VALUES(?, 'name', 'none')", file);
    this.run(
      "INSERT INTO fts(rowid, name, body) VALUES(?, ?, ?)",
      id,
      normalized(Store.nameText(path)),
      normalized(Store.folderText(path, this.home)),
    );
  }

  private deleteSegments(file: number, keepingName: boolean): void {
    const filter = keepingName ? "AND kind != 'name'" : "";
    this.run(`DELETE FROM fts WHERE rowid IN (SELECT id FROM segments WHERE file = ? ${filter})`, file);
    this.run(`DELETE FROM segments WHERE file = ? ${filter}`, file);
  }

  /** "Screenshot 2026-10-01 at 9.41.07 PM.png" → its searchable words. */
  static nameText(path: string): string {
    return lastPathComponent(path);
  }

  /** The folders a file sits in, relative to the home folder ("Downloads Invoices"), as low-weight keywords. */
  static folderText(path: string, home: string = homedir()): string {
    let folder = parentPath(path);
    // Swift's `hasPrefix` and `dropFirst(home.count)`: a home spelled decomposed still prefixes a precomposed path.
    if (startsWith(folder, home)) folder = folder.slice(new Graphemes(folder).start(graphemeCount(home)));
    return folder
      .split("/")
      .filter((part) => part !== "")
      .join(" ");
  }

  // MARK: Stats

  counts(): StoreCounts {
    const byKindAndState: Record<string, Record<string, number>> = {};
    for (const row of this.all(
      `SELECT kind, state, COUNT(*) AS n FROM files WHERE 1${this.scopeSQL} GROUP BY kind, state`,
      ...this.scopeValues,
    )) {
      const kind = str(row.kind) ?? "?";
      (byKindAndState[kind] ??= {})[str(row.state) ?? "?"] = num(row.n);
    }
    const { files: unfinished, left } = this.unfinishedCount();
    const inScope = this.scopeFolders === null ? "" : ` AND file IN (SELECT id FROM files WHERE 1${this.scopeSQL})`;
    const row = this.get(
      `SELECT COUNT(*) AS segments, COUNT(vec) AS vectors FROM segments WHERE kind != 'name'${inScope}`,
      ...this.scopeValues,
    );
    return { byKindAndState, vectors: num(row?.vectors ?? 0), segments: num(row?.segments ?? 0), unfinished, left };
  }
}
