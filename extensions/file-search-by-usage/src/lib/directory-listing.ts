import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { MAX_ENTRIES, ReadResult } from "./read-dir";
import { Entry } from "./types";
import { createReadPool } from "./bounded-reads";
import { createWorkQueue } from "./work-queue";
import { readBoundedDirectory } from "./bounded-directory";

const directoryRead = createReadPool();

export async function statEntryAsync(
  full: string,
  signal?: AbortSignal,
): Promise<Entry | undefined> {
  return readEntryMetadata(full, signal).catch(() => undefined);
}

/** Missing paths are definitive; provider and permission errors are not. */
export async function readEntryMetadata(
  full: string,
  signal?: AbortSignal,
): Promise<Entry | undefined> {
  try {
    if (signal?.aborted) return undefined;
    const linkStats = await fsp.lstat(full);
    if (signal?.aborted) return undefined;
    const isSymlink = linkStats.isSymbolicLink();
    const stats = isSymlink ? await fsp.stat(full) : linkStats;
    if (signal?.aborted) return undefined;
    return {
      name: path.basename(full),
      path: full,
      storagePath: await fsp.realpath(full),
      isDirectory: stats.isDirectory(),
      isSymlink,
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      birthtimeMs: stats.birthtimeMs,
      dev: stats.dev,
      ino: stats.ino,
    };
  } catch (error) {
    if (
      ["ENOENT", "ENOTDIR"].includes(
        (error as NodeJS.ErrnoException).code ?? "",
      )
    )
      return undefined;
    throw error;
  }
}

/**
 * How long a folder listing may take before the rest is reported as omitted.
 * Local folders finish in milliseconds; this only binds cold network mounts.
 */
const LISTING_BUDGET_MS = 3000;

/**
 * Read a folder's metadata in small batches without following subfolders.
 *
 * Returns one finished listing. It used to publish partial listings every
 * 100ms, which made rows appear and reorder while the user was reading them.
 * The caller now waits, so the wait is bounded: a cold network mount can take
 * seconds per entry, and without a deadline "wait for the whole folder" is
 * unbounded. Entries not read by the deadline are reported as omitted, the
 * same way the name cap reports them.
 */
export async function readDirectoryAsync(
  dir: string,
  showHidden: boolean,
  signal?: AbortSignal,
  options: { budgetMs?: number } = {},
): Promise<ReadResult> {
  const caller = signal ?? new AbortController().signal;
  if (caller.aborted) return { entries: [], truncated: 0 };
  // A deadline of its own, so one stalled entry cannot hold up the listing.
  const bounded = new AbortController();
  const stopForCaller = () => bounded.abort();
  caller.addEventListener("abort", stopForCaller, { once: true });
  const deadline = setTimeout(
    () => bounded.abort(),
    options.budgetMs ?? LISTING_BUDGET_MS,
  );
  const active = bounded.signal;
  let dirents: fs.Dirent[];
  let namesTruncated = false;
  try {
    const listing = await directoryRead(
      `list:${dir}:${showHidden}`,
      () => readBoundedDirectory(dir, MAX_ENTRIES, showHidden),
      active,
    );
    dirents = listing.entries;
    namesTruncated = listing.truncated;
  } catch (error) {
    return {
      entries: [],
      truncated: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  const entries: Entry[] = [];
  if (active.aborted) return { entries: [], truncated: 0 };
  const storageDir = await directoryRead(
    `real:${dir}`,
    () => fsp.realpath(dir),
    active,
  ).catch(() => dir);
  const completed: (Entry | undefined)[] = [];
  const queue = createWorkQueue<{ dirent: fs.Dirent; index: number }>(
    async ([{ dirent, index }]) => {
      const full = path.join(dir, dirent.name);
      const isSymlink = dirent.isSymbolicLink();
      const entry: Entry = {
        name: dirent.name,
        path: full,
        storagePath:
          storageDir === dir ? undefined : path.join(storageDir, dirent.name),
        isSymlink,
        isDirectory: dirent.isDirectory(),
        size: 0,
        mtimeMs: 0,
        birthtimeMs: 0,
        dev: undefined,
        ino: undefined,
      };
      try {
        const stats = await directoryRead(
          `stat:${full}`,
          () => fsp.stat(full),
          active,
        );
        Object.assign(entry, {
          isDirectory: stats.isDirectory(),
          size: stats.size,
          mtimeMs: stats.mtimeMs,
          birthtimeMs: stats.birthtimeMs,
          dev: stats.dev,
          ino: stats.ino,
        });
        if (isSymlink && !active.aborted)
          entry.storagePath = await directoryRead(
            `real:${full}`,
            () => fsp.realpath(full),
            active,
          );
      } catch {
        // Retain broken links and unreadable entries, as in the synchronous reader.
        try {
          if (active.aborted) return;
          const stats = await directoryRead(
            `lstat:${full}`,
            () => fsp.lstat(full),
            active,
          );
          Object.assign(entry, {
            size: stats.size,
            mtimeMs: stats.mtimeMs,
            birthtimeMs: stats.birthtimeMs,
          });
        } catch {
          /* Keep the directory entry without metadata. */
        }
      }

      if (!active.aborted) completed[index] = entry;
    },
    active,
    { concurrency: 8 },
  );
  try {
    await queue.push(dirents.map((dirent, index) => ({ dirent, index })));
    await queue.drain();
    entries.push(
      ...completed.filter((entry): entry is Entry => entry !== undefined),
    );
    const unread = dirents.length - entries.length;
    return {
      entries,
      // The caller shows one notice for omissions; a lower bound is enough.
      truncated: (namesTruncated ? 1 : 0) + Math.max(0, unread),
    };
  } finally {
    clearTimeout(deadline);
    caller.removeEventListener("abort", stopForCaller);
    queue.dispose();
  }
}

export type DirectorySnapshot = ReadResult & { pending: boolean };

/** Watches one open directory; polling also covers missed cloud-provider events. */
export function observeDirectory(
  dir: string,
  showHidden: boolean,
  publish: (snapshot: DirectorySnapshot) => void,
  { pollMs = 5000, debounceMs = 80 } = {},
): () => void {
  const controller = new AbortController();
  let watcher: fs.FSWatcher | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let dirty = false;
  let snapshot: DirectorySnapshot = {
    entries: [],
    truncated: 0,
    pending: true,
  };

  const refresh = async () => {
    if (controller.signal.aborted) return;
    if (running) {
      dirty = true;
      return;
    }
    running = true;
    // `finally`, because a throw anywhere below — including out of `publish`
    // into React — would otherwise latch the flag and stop every later
    // refresh for the rest of the command run.
    try {
      // Only the initial read withholds rows. Background polls must leave the
      // finished listing visible, otherwise even an unchanged folder loses focus.
      if (snapshot.pending) publish(snapshot);
      do {
        dirty = false;
        // One publication per read. The `pending` marker above already told the
        // caller work is in progress; partial rows would only move the list.
        const result = await readDirectoryAsync(
          dir,
          showHidden,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        if (isDeepStrictEqual(result.entries, snapshot.entries)) {
          result.entries = snapshot.entries;
        }
        const next = { ...result, pending: snapshot.pending && dirty };
        if (
          next.entries !== snapshot.entries ||
          next.error !== snapshot.error ||
          next.truncated !== snapshot.truncated ||
          next.pending !== snapshot.pending
        )
          snapshot = next;
        publish(snapshot);
      } while (dirty);
    } finally {
      running = false;
    }
  };
  const schedule = () => {
    if (controller.signal.aborted) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void refresh();
    }, debounceMs);
  };
  try {
    watcher = fs.watch(dir, schedule);
    watcher.on("error", () => {
      watcher?.close();
      watcher = undefined;
    });
  } catch {
    /* Poll when this location cannot be watched. */
  }
  const poll = setInterval(() => {
    // A slow read is already revalidating the folder; polling must not queue another.
    if (!running) void refresh();
  }, pollMs);
  void refresh();
  return () => {
    controller.abort();
    watcher?.close();
    clearInterval(poll);
    if (timer) clearTimeout(timer);
  };
}
