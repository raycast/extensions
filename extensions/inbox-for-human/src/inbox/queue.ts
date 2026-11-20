import {
  appendFileSync,
  existsSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
  writeSync,
  closeSync,
  watchFile,
  unwatchFile,
  constants as fsConstants,
  type Stats,
} from "node:fs";

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
 * Atomic-ish write of the queue: write a tmp file, rename over the target.
 *
 * No cross-process lock against the Python writer — this is best-effort. The
 * acceptable race window is a clobbered `opened_at` / archived row, which is
 * informational only.
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
 * Mark an entry as opened: best-effort, no lock against the Python writer.
 *
 * If the queue is missing or the entry isn't found, this is a no-op.
 */
export function markOpened(queuePath: string, id: string, now: Date = new Date()): void {
  const entries = readQueue(queuePath);
  if (entries.length === 0) return;
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return;
  entries[idx] = { ...entries[idx], opened_at: now.toISOString() };
  writeQueue(queuePath, entries);
}

/**
 * Archive a single entry by id: append to archive (atomic O_APPEND), then
 * remove from the active queue.
 *
 * Order matters: archive write is durable (append-only); the queue rewrite
 * comes after so a crash mid-archive leaves a duplicated entry rather than a
 * lost one.
 */
export function archiveById(queuePath: string, archivePath: string, id: string): void {
  const all = readQueue(queuePath);
  const target = all.find((e) => e.id === id);
  if (!target) return;
  appendArchiveLine(archivePath, target);
  writeQueue(
    queuePath,
    all.filter((e) => e.id !== id),
  );
}

/**
 * Archive every entry currently in the queue: append each to the archive
 * (atomic O_APPEND per entry), then truncate the queue to empty.
 *
 * Same ordering invariant as archiveById — archive writes are durable before
 * the queue rewrite, so a crash mid-run leaves duplicates rather than losses.
 */
export function archiveAll(queuePath: string, archivePath: string): number {
  const all = readQueue(queuePath);
  if (all.length === 0) return 0;
  for (const entry of all) {
    appendArchiveLine(archivePath, entry);
  }
  writeQueue(queuePath, []);
  return all.length;
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
