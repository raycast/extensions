import {
  appendFileSync,
  existsSync,
  fstatSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
  writeSync,
  closeSync,
  watchFile,
  unwatchFile,
  constants as fsConstants,
  type Stats,
} from "node:fs";
import { QUEUE_BUSY } from "./empty-state-content";

export type QueueEntry = {
  id: string;
  path: string;
  ask: string;
  context: string;
  timestamp: string;
  session_id?: string;
  opened_at?: string;
  /** Stamped by the writer when the path sits inside an Obsidian vault. */
  obsidian_url?: string;
};

/**
 * The queue file's state for the list view: `missing` (not created yet),
 * `damaged` (unreadable, not JSON, or not a list, which the skill also treats
 * as corrupt), or `ok`. Malformed entries inside a good list are dropped.
 */
export type QueueLoad = { state: "missing" | "damaged" | "ok"; entries: QueueEntry[] };

export function loadQueue(queuePath: string): QueueLoad {
  if (!existsSync(queuePath)) return { state: "missing", entries: [] };
  let raw: string;
  try {
    raw = readFileSync(queuePath, "utf8");
  } catch {
    return { state: "damaged", entries: [] };
  }
  if (raw.trim().length === 0) return { state: "ok", entries: [] };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { state: "damaged", entries: [] };
    return { state: "ok", entries: parsed.filter(isQueueEntry) };
  } catch {
    return { state: "damaged", entries: [] };
  }
}

/**
 * Read the queue's entries, empty on any failure. Used by the writers here,
 * which treat a missing or damaged queue as empty.
 */
export function readQueue(queuePath: string): QueueEntry[] {
  return loadQueue(queuePath).entries;
}

function isQueueEntry(value: unknown): value is QueueEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.path === "string" &&
    typeof v.ask === "string" &&
    typeof v.context === "string" &&
    typeof v.timestamp === "string"
  );
}

/**
 * Watch the queue file and call `onChange` whenever it changes on disk. Returns
 * a cleanup function that stops watching.
 *
 * Uses `fs.watchFile` (stat-based polling) rather than `fs.watch`: both writers
 * — this extension's `writeQueue` and the skill's `enqueue.py` — replace
 * the queue via a tmp file + rename, which swaps the inode. An inode-bound
 * `fs.watch` handle goes deaf after the first replace, whereas `watchFile`
 * re-stats the path each interval and keeps firing across atomic renames. The
 * 1s interval is invisible for a human-paced inbox and the file is tiny, so the
 * stat cost is negligible.
 *
 * Without this, externally-added entries don't surface until the command is
 * cold-relaunched, because Raycast keeps the command instance (and its
 * mount-time read) warm between re-opens.
 */
export function watchQueue(queuePath: string, onChange: () => void, intervalMs = 1000): () => void {
  const listener = (curr: Stats, prev: Stats): void => {
    // watchFile can emit a zeroed baseline event; only react to real mtime moves.
    if (curr.mtimeMs !== prev.mtimeMs) onChange();
  };
  watchFile(queuePath, { interval: intervalMs }, listener);
  return () => unwatchFile(queuePath, listener);
}

/**
 * macOS `O_EXLOCK` from <fcntl.h>. Node doesn't export it but passes open flags
 * through, and opening a file with it takes the same exclusive lock as
 * `flock(2)`: the lock the skill's enqueue.py holds (`fcntl.flock`) while it
 * reads, changes and replaces the queue. The extension is macOS only.
 */
export const O_EXLOCK = 0x20;

/** The skill held the queue's lock for longer than an enqueue ever takes. */
export class QueueBusyError extends Error {
  constructor() {
    super(QUEUE_BUSY);
    this.name = "QueueBusyError";
  }
}

export type LockOptions = { attempts?: number; retryMs?: number };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Whether `fd` is still the file at `path`, rather than one a writer has since renamed over. */
function isCurrentFile(fd: number, path: string): boolean {
  const held = fstatSync(fd);
  try {
    const current = statSync(path);
    return held.ino === current.ino && held.dev === current.dev;
  } catch {
    return false;
  }
}

/**
 * Run `fn` while holding the queue's exclusive lock, so the skill can't add a
 * file between `fn`'s read and its write. `fn` must re-read the queue itself.
 *
 * The skill holds the lock for milliseconds, so this retries every `retryMs`
 * and gives up with `QueueBusyError` after `attempts` tries (about 2 seconds).
 * Both writers replace the queue by renaming a tmp file over it, so a lock can
 * land on a file that was just replaced; it's then dropped and the new file
 * locked. A missing queue has nothing to change: returns `undefined` without
 * running `fn`.
 */
export async function withQueueLock<T>(
  queuePath: string,
  fn: () => T,
  { attempts = 100, retryMs = 20 }: LockOptions = {},
): Promise<T | undefined> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    let fd: number;
    try {
      fd = openSync(queuePath, fsConstants.O_RDONLY | fsConstants.O_NONBLOCK | O_EXLOCK);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return undefined;
      if (code !== "EAGAIN" && code !== "EWOULDBLOCK") throw err;
      await sleep(retryMs);
      continue;
    }
    try {
      if (isCurrentFile(fd, queuePath)) return fn();
    } finally {
      closeSync(fd);
    }
  }
  throw new QueueBusyError();
}

/**
 * Write the queue: write a tmp file, rename it over the target, as the skill
 * does. Callers that change existing entries hold `withQueueLock` around their
 * read and this write.
 */
export function writeQueue(queuePath: string, entries: QueueEntry[]): void {
  const tmp = `${queuePath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(entries, null, 2) + "\n", "utf8");
  renameSync(tmp, queuePath);
}

/**
 * Append a single archive line using POSIX `O_APPEND` mode.
 *
 * Per POSIX, single `write()` calls of size ≤ PIPE_BUF (typically 4096 bytes)
 * are atomic with respect to other appenders on the same fd flag. This avoids
 * needing a cross-process lock against other archivers.
 */
export function appendArchiveLine(archivePath: string, entry: QueueEntry): void {
  const archived = { ...entry, archived_at: new Date().toISOString() };
  const line = JSON.stringify(archived) + "\n";
  const fd = openSync(
    archivePath,
    // O_APPEND | O_CREAT | O_WRONLY
    fsConstants.O_APPEND | fsConstants.O_CREAT | fsConstants.O_WRONLY,
    0o644,
  );
  try {
    writeSync(fd, line);
  } finally {
    closeSync(fd);
  }
}

/**
 * Mark an entry as opened, under the queue's lock so an item the skill adds
 * meanwhile isn't overwritten. No-op if the queue is missing or the entry
 * isn't found.
 */
export async function markOpened(queuePath: string, id: string, now: Date = new Date()): Promise<void> {
  await withQueueLock(queuePath, () => {
    const entries = readQueue(queuePath);
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) return;
    entries[idx] = { ...entries[idx], opened_at: now.toISOString() };
    writeQueue(queuePath, entries);
  });
}

/**
 * Archive the entries with these ids, the ones the user chose, and return how
 * many were archived. Runs under the queue's lock and re-reads the queue, so
 * an item the skill added after the list was shown stays in the inbox.
 *
 * Order matters: the archive append (O_APPEND) comes before the queue rewrite,
 * so a crash between them leaves a duplicate rather than a lost entry.
 */
export async function archiveIds(
  queuePath: string,
  archivePath: string,
  ids: readonly string[],
  options?: LockOptions,
): Promise<number> {
  const wanted = new Set(ids);
  const archived = await withQueueLock(
    queuePath,
    () => {
      const all = readQueue(queuePath);
      const targets = all.filter((e) => wanted.has(e.id));
      if (targets.length === 0) return 0;
      for (const entry of targets) appendArchiveLine(archivePath, entry);
      writeQueue(
        queuePath,
        all.filter((e) => !wanted.has(e.id)),
      );
      return targets.length;
    },
    options,
  );
  return archived ?? 0;
}

/**
 * Fallback for vitest's appendFileSync-based tests: append using fs.appendFileSync,
 * which on Node uses `fs.open` with `O_APPEND` under the hood.
 *
 * Exposed for testing the appendFile-vs-O_APPEND contract.
 */
export function appendFileAtomic(archivePath: string, line: string): void {
  // appendFileSync uses 'a' flag = O_APPEND | O_CREAT | O_WRONLY.
  appendFileSync(archivePath, line, "utf8");
}
