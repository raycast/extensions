import { randomUUID } from "node:crypto";
import { mkdir, readdir, rename, rm, stat, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const MAX_COVER_BYTES = 5 * 1024 * 1024;
export const MAX_COVER_CACHE_BYTES = 100 * 1024 * 1024;
export const MAX_CACHED_COVERS = 500;
export const COVER_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const TEMPORARY_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const COVER_FILENAME = /^[a-f0-9]{64}\.(?:jpe?g|png|gif|webp)$/;
const TEMPORARY_FILENAME = /^[a-f0-9]{64}\.(?:jpe?g|png|gif|webp)\.[a-f0-9-]+\.tmp$/;
const queues = new Map<string, Promise<void>>();
const checkedDirectories = new Set<string>();
const retainedFiles = new Map<string, Map<string, number>>();

export class CoverCacheFullError extends Error {
  constructor() {
    super("The cover cache is full of images used by active searches.");
    this.name = "CoverCacheFullError";
  }
}

const isRetained = (directory: string, filename: string): boolean =>
  (retainedFiles.get(directory)?.get(filename) ?? 0) > 0;

const isInvalidCover = (
  directory: string,
  filename: string,
  file: { size: number; mtimeMs: number },
  now = Date.now(),
): boolean =>
  file.size === 0 ||
  file.size > MAX_COVER_BYTES ||
  (!isRetained(directory, filename) && now - file.mtimeMs > COVER_CACHE_MAX_AGE_MS);

// Register the whole search before loading, so eviction cannot race an existing cache hit.
export const retainCoverCacheFiles = (directory: string, filenames: string[]): (() => Promise<void>) => {
  const names = [...new Set(filenames)];
  let retained = retainedFiles.get(directory);
  if (!retained) retainedFiles.set(directory, (retained = new Map()));
  for (const name of names) retained.set(name, (retained.get(name) ?? 0) + 1);
  let released = false;
  return async () => {
    if (released) return;
    released = true;
    await withCache(directory, async () => {
      for (const name of names) {
        const count = retained.get(name) ?? 0;
        if (count <= 1) retained.delete(name);
        else retained.set(name, count - 1);
      }
      if (!retained.size) retainedFiles.delete(directory);
      await pruneCache(directory);
    });
  };
};

// Serialize cache reads, eviction and writes; network downloads stay concurrent.
const withCache = async <T>(directory: string, operation: () => Promise<T>): Promise<T> => {
  const previous = queues.get(directory) ?? Promise.resolve();
  const result = previous.then(operation);
  const next = result.then(
    () => {},
    () => {},
  );
  queues.set(directory, next);
  try {
    return await result;
  } finally {
    if (queues.get(directory) === next) queues.delete(directory);
  }
};

const pruneCache = async (directory: string, reservedBytes = 0, reservedFiles = 0): Promise<boolean> => {
  const now = Date.now();
  const entries = await readdir(directory, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const covers: { path: string; filename: string; size: number; modified: number }[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const temporary = TEMPORARY_FILENAME.test(entry.name);
    if (!temporary && !COVER_FILENAME.test(entry.name)) continue;
    const path = join(directory, entry.name);
    const file = await stat(path);
    if (temporary) {
      if (now - file.mtimeMs > TEMPORARY_MAX_AGE_MS) await rm(path, { force: true });
    } else if (isInvalidCover(directory, entry.name, file, now)) {
      await rm(path, { force: true });
    } else {
      covers.push({ path, filename: entry.name, size: file.size, modified: file.mtimeMs });
    }
  }
  covers.sort((a, b) => a.modified - b.modified || a.path.localeCompare(b.path));
  let bytes = covers.reduce((total, cover) => total + cover.size, reservedBytes);
  let count = covers.length + reservedFiles;
  for (const cover of covers) {
    if (bytes <= MAX_COVER_CACHE_BYTES && count <= MAX_CACHED_COVERS) break;
    if (isRetained(directory, cover.filename)) continue;
    await rm(cover.path, { force: true });
    bytes -= cover.size;
    count--;
  }
  checkedDirectories.add(directory);
  return bytes <= MAX_COVER_CACHE_BYTES && count <= MAX_CACHED_COVERS;
};

const findCachedCover = async (directory: string, filename: string): Promise<boolean> => {
  const path = join(directory, filename);
  const file = await stat(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  if (!file?.isFile()) return false;
  if (isInvalidCover(directory, filename, file)) {
    await rm(path, { force: true });
    return false;
  }
  const now = new Date();
  await utimes(path, now, now);
  return true;
};

export const getCachedCoverFile = (directory: string, filename: string, signal?: AbortSignal): Promise<boolean> =>
  withCache(directory, async () => {
    signal?.throwIfAborted();
    if (!checkedDirectories.has(directory)) await pruneCache(directory);
    return findCachedCover(directory, filename);
  });

export const saveCoverFile = (
  directory: string,
  filename: string,
  content: Buffer,
  signal?: AbortSignal,
): Promise<void> =>
  withCache(directory, async () => {
    signal?.throwIfAborted();
    const path = join(directory, filename);
    // Another request for this URL may have filled the cache during the download.
    if (await findCachedCover(directory, filename)) return;
    await mkdir(directory, { recursive: true });
    if (!(await pruneCache(directory, content.byteLength, 1))) throw new CoverCacheFullError();
    signal?.throwIfAborted();
    const temporaryPath = `${path}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, content);
      signal?.throwIfAborted();
      await rename(temporaryPath, path);
    } finally {
      await rm(temporaryPath, { force: true });
    }
  });
