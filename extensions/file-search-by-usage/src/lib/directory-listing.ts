import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { MAX_ENTRIES, ReadResult } from "./read-dir";
import { Entry } from "./types";

export async function statEntryAsync(full: string): Promise<Entry | undefined> {
  try {
    const linkStats = await fsp.lstat(full);
    const isSymlink = linkStats.isSymbolicLink();
    const stats = isSymlink ? await fsp.stat(full) : linkStats;
    return {
      name: path.basename(full),
      path: full,
      storagePath: isSymlink ? await fsp.realpath(full) : undefined,
      isDirectory: stats.isDirectory(),
      isSymlink,
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      birthtimeMs: stats.birthtimeMs,
      dev: stats.dev,
      ino: stats.ino,
    };
  } catch {
    return undefined;
  }
}

/** Read metadata in small batches without blocking typing or following subfolders. */
export async function readDirectoryAsync(
  dir: string,
  showHidden: boolean,
  signal?: AbortSignal,
): Promise<ReadResult> {
  let dirents: fs.Dirent[];
  try {
    dirents = await fsp.readdir(dir, { withFileTypes: true });
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
  const selected = visible.slice(0, MAX_ENTRIES);
  for (let i = 0; i < selected.length && !signal?.aborted; i += 8) {
    const batch = await Promise.all(
      selected.slice(i, i + 8).map(async (dirent) => {
        const full = path.join(dir, dirent.name);
        const isSymlink = dirent.isSymbolicLink();
        const entry: Entry = {
          name: dirent.name,
          path: full,
          storagePath: undefined,
          isSymlink,
          isDirectory: dirent.isDirectory(),
          size: 0,
          mtimeMs: 0,
          birthtimeMs: 0,
          dev: undefined,
          ino: undefined,
        };
        try {
          const stats = await fsp.stat(full);
          Object.assign(entry, {
            isDirectory: stats.isDirectory(),
            size: stats.size,
            mtimeMs: stats.mtimeMs,
            birthtimeMs: stats.birthtimeMs,
            dev: stats.dev,
            ino: stats.ino,
          });
          if (isSymlink) entry.storagePath = await fsp.realpath(full);
        } catch {
          // Retain broken links and unreadable entries, as in the synchronous reader.
          try {
            const stats = await fsp.lstat(full);
            Object.assign(entry, {
              size: stats.size,
              mtimeMs: stats.mtimeMs,
              birthtimeMs: stats.birthtimeMs,
            });
          } catch {
            /* Keep the directory entry without metadata. */
          }
        }
        return entry;
      }),
    );
    entries.push(...batch);
  }
  return { entries, truncated: Math.max(0, visible.length - MAX_ENTRIES) };
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
    publish({ ...snapshot, pending: true });
    do {
      dirty = false;
      const result = await readDirectoryAsync(
        dir,
        showHidden,
        controller.signal,
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
