import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import type { DatabaseSync } from "node:sqlite";
import { NOISE_SEGMENTS } from "./read-dir";
import type { FileRow } from "./index-db";

/**
 * Building the index with fd.
 *
 * fd is spawned with an argument array, never a shell string: filenames may
 * contain spaces, tabs, quotes, newlines and shell metacharacters, and the only
 * safe framing is NUL-delimited output read straight from the pipe.
 *
 * Verified fd 10.5.0 behaviour that this depends on:
 *   - `--absolute-path --follow` prints the *visible* path walked through a
 *     symlink, not the resolved target, so a shortcut keeps the path the user
 *     recognises and two shortcuts to one target stay two entries.
 *   - Traversal errors are reported with --show-errors; saved coverage is kept.
 *   - A broken symlink is still listed, so it stays findable.
 *   - Directories are printed with a trailing separator, which supplies the
 *     type without a stat.
 *   - `--exclude` applies inside followed symlinks as well.
 */

/** Directories never worth indexing, beyond the shared noise list. */
export const INDEX_EXCLUSIONS = [
  ".git",
  ...NOISE_SEGMENTS,
  ".Trash",
  ".DS_Store",
] as const;

/** Paths stat'ed at once. Bounded so a slow mount cannot queue unboundedly. */
const STAT_CONCURRENCY = 16;
/** Rows per transaction. Large enough to amortise fsync, small enough to bound memory. */
const BATCH_ROWS = 1_000;

export type ScanStop = "time-limit" | "item-limit" | "cancelled";

/** Per-root note stored in `index_roots`. Keyed so a new stop cannot be missed. */
const STOP_NOTES: Record<ScanStop, string> = {
  "time-limit": "Stopped at the time limit; saved paths were kept.",
  "item-limit": "Stopped at the item limit; saved paths were kept.",
  cancelled: "Cancelled; saved paths were kept.",
};

/** The same stops, phrased for the run summary. */
const STOP_SUMMARIES: Record<ScanStop, string> = {
  "time-limit": "stopped at the time limit",
  "item-limit": "stopped at the item limit",
  cancelled: "cancelled",
};

export type RootOutcome = {
  root: string;
  /** Paths fd emitted. */
  scanned: number;
  /** Rows written to the database. */
  indexed: number;
  elapsedMs: number;
  /** True only when fd finished the whole root and stale rows were removed. */
  complete: boolean;
  stopped?: ScanStop;
  /** Set when the root could not be read at all. */
  error?: string;
};

export type ScanProgress = {
  root: string;
  scanned: number;
  indexed: number;
  elapsedMs: number;
};

export type ScanOptions = {
  fd: string;
  roots: string[];
  db: DatabaseSync;
  signal?: AbortSignal;
  /** Wall-clock ceiling for the whole run. */
  budgetMs?: number;
  /** Hard ceiling on rows per root. */
  maxEntries?: number;
  showHidden?: boolean;
  /** Respect .gitignore, .ignore and .fdignore found while scanning. */
  useIgnoreFiles?: boolean;
  /** User exclusion globs, added to the built-in list. */
  patterns?: readonly string[];
  onProgress?: (progress: ScanProgress) => void;
  /** Injection point for tests; defaults to spawning fd. */
  spawnFd?: (args: string[], signal?: AbortSignal) => AsyncIterable<Buffer>;
  assertOwned?: () => void;
};

/**
 * Drop any root contained in another.
 *
 * Overlapping roots would let one path be written under two different `root`
 * values, and a later complete scan of the outer root would not recognise the
 * rows the inner scan relabelled. Removing the overlap keeps each path owned by
 * exactly one root, which is what makes stale removal scope-safe.
 */
export function normalizeRoots(roots: readonly string[]): string[] {
  const cleaned = [
    ...new Set(roots.map((root) => path.resolve(root)).filter(Boolean)),
  ].sort((a, b) => a.length - b.length);
  const kept: string[] = [];
  for (const root of cleaned) {
    const inside = kept.some((existing) => containsPath(existing, root));
    if (!inside) kept.push(root);
  }
  return kept;
}

function containsPath(root: string, candidate: string): boolean {
  return (
    candidate === root ||
    candidate.startsWith(root.endsWith(path.sep) ? root : root + path.sep)
  );
}

/**
 * Canonicalise roots before scanning.
 *
 * fd resolves the search path it is given: handed `/var/x` it prints
 * `/private/var/x`. Symlinks *inside* the walk are still reported by their
 * visible path, which is the property shortcuts depend on; it is only the root
 * that is normalised. Storing the resolved root keeps `index_roots.root` a real
 * prefix of its own rows, and makes two spellings of one root collapse instead
 * of creating two overlapping records that fight over the same paths.
 */
export async function resolveRoots(
  roots: readonly string[],
): Promise<string[]> {
  const resolved: string[] = [];
  for (const root of roots) {
    try {
      resolved.push(await fsp.realpath(root));
    } catch {
      // Keep it: scanRoot reports an unavailable root rather than dropping it.
      resolved.push(path.resolve(root));
    }
  }
  return normalizeRoots(resolved);
}

/**
 * Exclusions that stop one subtree being indexed under two names.
 *
 * A home folder commonly holds symlinks to the cloud folders under
 * ~/Library/CloudStorage. Following them indexes every one of those files
 * twice, once under the link and once under the real path, which doubles the
 * work and fills the list with pairs.
 *
 * Which spelling to keep is not arbitrary. `~/Shared Documents` is a
 * link the user made and recognises; `~/Library/CloudStorage/Dropbox-...` is
 * machinery. So when a link inside this root points somewhere else inside the
 * same root, the link wins and the target is excluded. When it points into a
 * different root, that root's own scan owns those files and the link is
 * excluded instead.
 *
 * Returned as gitignore-anchored paths relative to the root: `/Name` or
 * `/Library/CloudStorage`. Anchoring matters twice over. It confines the
 * exclusion to this root, and it is the only form fd honours for a path, since
 * `--exclude` otherwise matches the bare name and would take same-named
 * entries anywhere in the tree.
 */
export async function redundantLinks(
  root: string,
  roots: readonly string[],
): Promise<string[]> {
  let entries;
  try {
    entries = await fsp.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = new Set<string>();
  for (const entry of entries) {
    if (!entry.isSymbolicLink()) continue;
    let target: string;
    try {
      target = await fsp.realpath(path.join(root, entry.name));
    } catch {
      // A broken link costs nothing to walk; leave it to the scan.
      continue;
    }
    if (containsPath(root, target)) {
      // Keep the link the user made, drop the path it points at.
      const relative = path.relative(root, target);
      if (relative !== "") out.add(`/${relative}`);
      continue;
    }
    // Owned by another root's scan, so this spelling is the duplicate.
    if (roots.some((other) => other !== root && containsPath(other, target)))
      out.add(`/${entry.name}`);
  }
  return [...out];
}

export type FdScanOptions = {
  showHidden?: boolean;
  /** Respect .gitignore, .ignore and .fdignore found while scanning. */
  useIgnoreFiles?: boolean;
  /** User globs, added to the built-in exclusions. Passed to fd verbatim. */
  patterns?: readonly string[];
};

/** fd arguments. Kept in one place so the effective scope stays auditable. */
export function fdArguments(
  root: string,
  options: FdScanOptions | boolean = {},
): string[] {
  // A boolean was the original signature and several call sites still read well
  // that way; both forms mean showHidden.
  const {
    showHidden = true,
    useIgnoreFiles = false,
    patterns = [],
  } = typeof options === "boolean" ? { showHidden: options } : options;

  const args = ["--absolute-path", "--print0", "--follow", "--show-errors"];
  if (useIgnoreFiles) {
    // fd only applies gitignore rules inside a repository unless told otherwise.
    args.push("--no-require-git");
  } else {
    // fd's default respects .gitignore; an index of the user's own files must
    // not, unless they ask for it.
    args.push("--no-ignore");
  }
  if (showHidden) args.push("--hidden");
  for (const exclusion of INDEX_EXCLUSIONS) args.push("--exclude", exclusion);
  for (const pattern of patterns) args.push("--exclude", pattern);
  // A bare pattern of "." matches every entry; the root is the search path.
  args.push(".", root);
  return args;
}

/**
 * Run fd and yield its stdout.
 *
 * Exported so the harness can check the process lifecycle: an already-cancelled
 * scan must not spawn anything, and cancelling a running scan must kill the
 * child rather than leave it crawling a network mount in the background.
 */
export async function* spawnFdDefault(
  fd: string,
  args: string[],
  signal?: AbortSignal,
): AsyncIterable<Buffer> {
  if (signal?.aborted) return;
  const child = spawn(fd, args, { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    // Keep only enough to explain a failure; fd can be noisy about permissions.
    if (stderr.length < 4_000) stderr += chunk.slice(0, 4_000 - stderr.length);
  });
  const finished = new Promise<{ ok: boolean; code: number | null }>(
    (resolve) => {
      child.once("error", () => resolve({ ok: false, code: null }));
      child.once("close", (code) => resolve({ ok: code === 0, code }));
    },
  );
  const stop = () => child.kill("SIGKILL");
  signal?.addEventListener("abort", stop, { once: true });
  try {
    if (signal?.aborted) stop();
    for await (const chunk of child.stdout) {
      if (signal?.aborted) return;
      yield chunk as Buffer;
    }
    const result = await finished;
    // Exit 1 means "no matches" only with --quiet, which we never use.
    // fd can also report traversal errors while exiting zero. Either prevents
    // treating absence as evidence that saved paths have been deleted.
    if ((!result.ok || stderr.trim()) && !signal?.aborted)
      throw new Error(stderr.trim() || `fd exited with code ${result.code}`);
  } finally {
    signal?.removeEventListener("abort", stop);
    if (child.exitCode === null && child.signalCode === null) stop();
    await finished;
  }
}

type Observed = { path: string; isDir: boolean };

/**
 * Read one entry's metadata.
 *
 * A single `lstat` answers the common case. Only an actual symlink needs the
 * extra `stat` and `realpath`, which describe the target the user opens while
 * `path` keeps the visible route to it. A broken link keeps its row with empty
 * metadata so it stays findable rather than silently disappearing.
 */
async function describe(entry: Observed, root: string): Promise<FileRow> {
  const base: FileRow = {
    path: entry.path,
    name: path.basename(entry.path),
    parent: path.dirname(entry.path),
    root,
    is_dir: entry.isDir ? 1 : 0,
    is_symlink: 0,
    size: 0,
    mtime_ms: 0,
    birthtime_ms: 0,
    storage_path: null,
  };

  try {
    const link = await fsp.lstat(entry.path);
    if (!link.isSymbolicLink())
      return {
        ...base,
        is_dir: link.isDirectory() ? 1 : base.is_dir,
        size: link.size,
        mtime_ms: Math.trunc(link.mtimeMs),
        birthtime_ms: Math.trunc(link.birthtimeMs),
      };

    let storage: string | null = null;
    try {
      storage = await fsp.realpath(entry.path);
    } catch {
      /* A dangling link has no target; the visible entry is still useful. */
    }
    try {
      const target = await fsp.stat(entry.path);
      return {
        ...base,
        is_symlink: 1,
        is_dir: target.isDirectory() ? 1 : 0,
        size: target.size,
        mtime_ms: Math.trunc(target.mtimeMs),
        birthtime_ms: Math.trunc(target.birthtimeMs),
        storage_path: storage === entry.path ? null : storage,
      };
    } catch {
      return {
        ...base,
        is_symlink: 1,
        mtime_ms: Math.trunc(link.mtimeMs),
        birthtime_ms: Math.trunc(link.birthtimeMs),
        storage_path: storage === entry.path ? null : storage,
      };
    }
  } catch {
    // Gone between fd listing it and this read, or unreadable. Index the name.
    return base;
  }
}

/** Bounded-concurrency map that preserves nothing but the completed rows. */
async function describeAll(
  entries: Observed[],
  root: string,
): Promise<FileRow[]> {
  const rows: FileRow[] = [];
  let next = 0;
  const workers = Array.from(
    { length: Math.min(STAT_CONCURRENCY, entries.length) },
    async () => {
      for (;;) {
        const index = next++;
        if (index >= entries.length) return;
        rows.push(await describe(entries[index], root));
      }
    },
  );
  await Promise.all(workers);
  return rows;
}

const UPSERT = `
INSERT INTO files (path, name, parent, root, is_dir, is_symlink, size, mtime_ms, birthtime_ms, storage_path, scan_id)
VALUES (:path, :name, :parent, :root, :is_dir, :is_symlink, :size, :mtime_ms, :birthtime_ms, :storage_path, :scan_id)
ON CONFLICT(path) DO UPDATE SET
  name = excluded.name,
  parent = excluded.parent,
  root = excluded.root,
  is_dir = excluded.is_dir,
  is_symlink = excluded.is_symlink,
  size = excluded.size,
  mtime_ms = excluded.mtime_ms,
  birthtime_ms = excluded.birthtime_ms,
  storage_path = excluded.storage_path,
  scan_id = excluded.scan_id
`;

/**
 * Undo a transaction without displacing the failure that prompted it. SQLite
 * aborts the transaction itself on a full disk or an I/O error, and the
 * ROLLBACK then throws "cannot rollback - no transaction is active", which
 * would reach the user's toast in place of the real cause.
 */
function rollback(db: DatabaseSync): void {
  try {
    db.exec("ROLLBACK");
  } catch {
    /* Already rolled back. */
  }
}

/** Monotonic scan identifier; stale removal compares against it. */
export function nextScanId(db: DatabaseSync): number {
  const row = db
    .prepare("SELECT COALESCE(MAX(scan_id), 0) AS last FROM files")
    .get() as { last: number };
  return Number(row?.last ?? 0) + 1;
}

/**
 * Index one root.
 *
 * Writes are upserts inside batched transactions, so a search reading through
 * WAL always sees a whole batch or none of it. Stale rows are removed only
 * after fd has finished the root without stopping early: a partial scan proves
 * that a path is present, never that a path is gone.
 */
export async function scanRoot(
  root: string,
  options: ScanOptions,
  deadline: number,
  /** Anchored names to skip, from `redundantLinks`. */
  linkExclusions: readonly string[] = [],
): Promise<RootOutcome> {
  const {
    db,
    fd,
    maxEntries = Infinity,
    showHidden = true,
    onProgress,
    assertOwned,
  } = options;
  const started = Date.now();
  const scanId = nextScanId(db);
  const upsert = db.prepare(UPSERT);

  let scanned = 0;
  let indexed = 0;
  let stopped: ScanStop | undefined;
  let error: string | undefined;

  const commit = (rows: FileRow[]) => {
    if (rows.length === 0) return;
    assertOwned?.();
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const row of rows)
        upsert.run({
          ...row,
          storage_path: row.storage_path,
          scan_id: scanId,
        } as unknown as Record<string, null | number | bigint | string>);
      db.exec("COMMIT");
      indexed += rows.length;
    } catch (writeError) {
      rollback(db);
      throw writeError;
    }
  };

  const pending: Observed[] = [];
  const flush = async () => {
    if (pending.length === 0) return;
    const batch = pending.splice(0, pending.length);
    commit(await describeAll(batch, root));
    onProgress?.({
      root,
      scanned,
      indexed,
      elapsedMs: Date.now() - started,
    });
  };

  try {
    // Confirm the root is still there; a drive can unmount between runs.
    const stats = await fsp.stat(root);
    if (!stats.isDirectory()) throw new Error("not a directory");
  } catch {
    return {
      root,
      scanned: 0,
      indexed: 0,
      elapsedMs: Date.now() - started,
      complete: false,
      error: "This location is unavailable.",
    };
  }

  const fdArgs = fdArguments(root, {
    showHidden,
    useIgnoreFiles: options.useIgnoreFiles,
    // Anchored link exclusions come first so they cannot be confused with the
    // user's own name globs.
    patterns: [...linkExclusions, ...(options.patterns ?? [])],
  });
  // A quiet or stalled fd process must not outlive the budget merely because
  // there is no next chunk at which to check the clock.
  const timeLimit = new AbortController();
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeLimit.signal])
    : timeLimit.signal;
  const timer = Number.isFinite(deadline)
    ? setTimeout(() => timeLimit.abort(), Math.max(0, deadline - Date.now()))
    : undefined;
  try {
    const source =
      options.spawnFd?.(fdArgs, signal) ?? spawnFdDefault(fd, fdArgs, signal);
    const decoder = new StringDecoder("utf8");
    let buffered = "";
    outer: for await (const chunk of source) {
      buffered += decoder.write(chunk);
      let start = 0;
      for (
        let end = buffered.indexOf("\0");
        end >= 0;
        end = buffered.indexOf("\0", start)
      ) {
        const raw = buffered.slice(start, end);
        start = end + 1;
        if (raw === "") continue;
        scanned++;
        if (indexed + pending.length >= maxEntries) {
          stopped = "item-limit";
          break outer;
        }
        // fd marks directories with a trailing separator.
        const isDir = raw.endsWith(path.sep);
        pending.push({
          path: isDir ? raw.slice(0, -1) : raw,
          isDir,
        });
        if (pending.length >= BATCH_ROWS) {
          await flush();
          if (signal?.aborted) {
            stopped = "cancelled";
            break outer;
          }
          if (Date.now() > deadline) {
            stopped = "time-limit";
            break outer;
          }
        }
      }
      buffered = buffered.slice(start);
      // A single path cannot legitimately grow without bound.
      if (buffered.length > 1 << 20)
        throw new Error("fd emitted an oversized path");
      if (signal?.aborted) {
        stopped = "cancelled";
        break;
      }
      if (Date.now() > deadline) {
        stopped = "time-limit";
        break;
      }
    }
    buffered += decoder.end();
    if (stopped === undefined && buffered !== "") {
      scanned++;
      const isDir = buffered.endsWith(path.sep);
      pending.push({ path: isDir ? buffered.slice(0, -1) : buffered, isDir });
    }
    await flush();
  } catch (scanError) {
    // Keep whatever was already committed; report why the rest is missing.
    try {
      await flush();
    } catch {
      /* The first failure is the one worth reporting. */
    }
    error =
      scanError instanceof Error
        ? scanError.message
        : "This location could not be read.";
  } finally {
    clearTimeout(timer);
  }

  // Cancellation can arrive during the final stdout read or metadata flush,
  // without another chunk to trigger the checks inside the loop.
  if (signal.aborted)
    stopped = options.signal?.aborted ? "cancelled" : "time-limit";
  else if (stopped === undefined && Date.now() > deadline)
    stopped = "time-limit";
  const complete = stopped === undefined && error === undefined;
  if (complete) {
    // Only now is absence meaningful: fd walked the whole root.
    assertOwned?.();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("DELETE FROM files WHERE root = ? AND scan_id != ?").run(
        root,
        scanId,
      );
      db.exec("COMMIT");
    } catch (deleteError) {
      rollback(db);
      throw deleteError;
    }
  }

  const counted = db
    .prepare("SELECT count(*) AS n FROM files WHERE root = ?")
    .get(root) as { n: number } | undefined;
  const files = Number(counted?.n ?? 0);
  // `error` can be an empty message, which must still fall through to the stop.
  const note = error ? error : stopped ? STOP_NOTES[stopped] : null;
  assertOwned?.();
  db.prepare(
    `INSERT INTO index_roots (root, scanned_at, complete, files, note)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(root) DO UPDATE SET
       scanned_at = excluded.scanned_at,
       complete = excluded.complete,
       files = excluded.files,
       note = excluded.note`,
  ).run(root, Date.now(), complete ? 1 : 0, files, note);

  return {
    root,
    scanned,
    indexed,
    elapsedMs: Date.now() - started,
    complete,
    stopped,
    error,
  };
}

export type ScanReport = {
  roots: RootOutcome[];
  scanned: number;
  indexed: number;
  elapsedMs: number;
  /** True when every root completed. */
  complete: boolean;
  /** Roots dropped from scope, whose rows this scan removed. */
  forgotten: string[];
};

/**
 * Drop roots that are no longer in scope.
 *
 * `scanRoot` deletes stale rows scoped to the root it just finished, so a root
 * removed from the configuration is never visited and its rows would otherwise
 * stay forever, returning hits for a location the user took out of scope.
 *
 * This runs only when every configured root completed. Absence is meaningful
 * then and only then: after a partial, failed, or cancelled run there is no way
 * to tell a removed root from one this run simply did not reach.
 */
function forgetUnconfiguredRoots(
  db: DatabaseSync,
  configured: string[],
  assertOwned?: () => void,
): string[] {
  const known = (
    db.prepare("SELECT DISTINCT root FROM files").all() as { root: string }[]
  ).map((row) => row.root);
  const wanted = new Set(configured);
  const gone = known.filter((root) => !wanted.has(root));
  if (gone.length === 0) return [];

  assertOwned?.();
  db.exec("BEGIN IMMEDIATE");
  try {
    const files = db.prepare("DELETE FROM files WHERE root = ?");
    const roots = db.prepare("DELETE FROM index_roots WHERE root = ?");
    for (const root of gone) {
      files.run(root);
      roots.run(root);
    }
    db.exec("COMMIT");
  } catch (error) {
    rollback(db);
    throw error;
  }
  return gone;
}

/** Index every root in turn, sharing one time budget. */
export async function scanRoots(options: ScanOptions): Promise<ScanReport> {
  const started = Date.now();
  const budget = options.budgetMs ?? 900_000;
  const deadline = started + budget;
  const roots = await resolveRoots(options.roots);
  const outcomes: RootOutcome[] = [];

  /*
   * Progress is reported for the run, not for the root being walked.
   *
   * `scanRoot` counts from zero and times from its own start, so passing its
   * numbers straight through made a multi-root scan count up, drop back to
   * near zero at each root, and finish by reporting the last and smallest
   * root: 4,603 indexed and 0s for a run that did 437,693 in 13s.
   */
  let doneScanned = 0;
  let doneIndexed = 0;
  const report = options.onProgress;
  const aggregated: ScanOptions = report
    ? {
        ...options,
        onProgress: (progress) =>
          report({
            root: progress.root,
            scanned: doneScanned + progress.scanned,
            indexed: doneIndexed + progress.indexed,
            elapsedMs: Date.now() - started,
          }),
      }
    : options;

  for (const root of roots) {
    if (options.signal?.aborted || Date.now() > deadline) {
      outcomes.push({
        root,
        scanned: 0,
        indexed: 0,
        elapsedMs: 0,
        complete: false,
        stopped: options.signal?.aborted ? "cancelled" : "time-limit",
      });
      continue;
    }
    const outcome = await scanRoot(
      root,
      aggregated,
      deadline,
      await redundantLinks(root, roots),
    );
    doneScanned += outcome.scanned;
    doneIndexed += outcome.indexed;
    outcomes.push(outcome);
  }

  const complete =
    roots.length > 0 &&
    !options.signal?.aborted &&
    outcomes.every((o) => o.complete);
  const forgotten = complete
    ? forgetUnconfiguredRoots(options.db, roots, options.assertOwned)
    : [];

  return {
    roots: outcomes,
    scanned: outcomes.reduce((sum, outcome) => sum + outcome.scanned, 0),
    indexed: outcomes.reduce((sum, outcome) => sum + outcome.indexed, 0),
    elapsedMs: Date.now() - started,
    complete,
    forgotten,
  };
}

/** Counts and elapsed time, with no invented percentage. */
export function describeScan(report: ScanReport): string {
  const seconds = Math.max(1, Math.round(report.elapsedMs / 1000));
  const parts = [
    `${report.indexed.toLocaleString()} indexed`,
    `${report.scanned.toLocaleString()} seen`,
    `${seconds}s`,
  ];
  const notes = report.roots
    .map((root) =>
      // An empty error message must still fall through to the stop, as before.
      root.error
        ? root.error
        : root.stopped
          ? STOP_SUMMARIES[root.stopped]
          : undefined,
    )
    .filter((note): note is string => note !== undefined);
  if (report.forgotten.length > 0)
    notes.push(
      `${report.forgotten.length} location(s) no longer in scope removed`,
    );
  return [parts.join(" · "), ...new Set(notes)].join(" · ");
}
