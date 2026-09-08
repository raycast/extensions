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

/** Read metadata in small batches without blocking typing or following subfolders. */
export async function readDirectoryAsync(
  dir: string,
  showHidden: boolean,
  signal?: AbortSignal,
  options: {
    continuous?: boolean;
    onProgress?: (entries: Entry[]) => void;
  } = {},
): Promise<ReadResult> {
  const active = signal ?? new AbortController().signal;
  if (active.aborted) return { entries: [], truncated: 0 };
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
  const visible = showHidden
    ? dirents
    : dirents.filter((d) => !d.name.startsWith("."));
  const entries: Entry[] = [];
  if (active.aborted) return { entries: [], truncated: 0 };
  const storageDir = await directoryRead(
    `real:${dir}`,
    () => fsp.realpath(dir),
    active,
  ).catch(() => dir);
  const selected = visible.slice(0, MAX_ENTRIES);
  let lastPublished = 0;
  let publishTimer: ReturnType<typeof setTimeout> | undefined;
  const completed: (Entry | undefined)[] = [];
  const publish = (flush = false) => {
    if (active.aborted) return;
    if (flush || Date.now() - lastPublished >= 100) {
      clearTimeout(publishTimer);
      publishTimer = undefined;
      lastPublished = Date.now();
      options.onProgress?.(
        completed.filter((entry): entry is Entry => entry !== undefined),
      );
    } else if (!publishTimer)
      publishTimer = setTimeout(() => publish(true), 100);
  };
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

      if (!active.aborted) {
        completed[index] = entry;
        publish();
      }
    },
    active,
    { concurrency: 8 },
  );
  try {
    await queue.push(selected.map((dirent, index) => ({ dirent, index })));
    await queue.drain();
    entries.push(
      ...completed.filter((entry): entry is Entry => entry !== undefined),
    );
    if (!active.aborted) publish(true);
    return {
      entries,
      truncated: namesTruncated ? 1 : 0,
    };
  } finally {
    queue.dispose();
    clearTimeout(publishTimer);
  }
}

export type DirectorySnapshot = ReadResult & { pending: boolean };

/** Watches one open directory; polling also covers missed cloud-provider events. */
export function observeDirectory(
  dir: string,
  showHidden: boolean,
  publish: (snapshot: DirectorySnapshot) => void,
  { pollMs = 5000, debounceMs = 80, continuous = false } = {},
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
    publish({ ...snapshot, pending: true });
    do {
      dirty = false;
      const result = await readDirectoryAsync(
        dir,
        showHidden,
        controller.signal,
        {
          continuous,
          onProgress:
            snapshot.entries.length === 0
              ? (entries) => {
                  if (!controller.signal.aborted)
                    publish({ entries, truncated: 0, pending: true });
                }
              : undefined,
        },
      );
      if (controller.signal.aborted) return;
      if (isDeepStrictEqual(result.entries, snapshot.entries)) {
        result.entries = snapshot.entries;
      }
      snapshot = { ...result, pending: dirty };
      publish(snapshot);
    } while (dirty);
    running = false;
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
