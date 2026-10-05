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

const pruneCache = async (directory: string, reservedBytes = 0, reservedFiles = 0): Promise<void> => {
  const now = Date.now();
  const entries = await readdir(directory, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const covers: { path: string; size: number; modified: number }[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const temporary = TEMPORARY_FILENAME.test(entry.name);
    if (!temporary && !COVER_FILENAME.test(entry.name)) continue;
    const path = join(directory, entry.name);
    const file = await stat(path);
    if (temporary) {
      if (now - file.mtimeMs > TEMPORARY_MAX_AGE_MS) await rm(path, { force: true });
    } else if (file.size === 0 || file.size > MAX_COVER_BYTES || now - file.mtimeMs > COVER_CACHE_MAX_AGE_MS) {
      await rm(path, { force: true });
    } else {
      covers.push({ path, size: file.size, modified: file.mtimeMs });
    }
  }
  covers.sort((a, b) => a.modified - b.modified || a.path.localeCompare(b.path));
  let bytes = covers.reduce((total, cover) => total + cover.size, reservedBytes);
  let count = covers.length + reservedFiles;
  for (const cover of covers) {
    if (bytes <= MAX_COVER_CACHE_BYTES && count <= MAX_CACHED_COVERS) break;
    await rm(cover.path, { force: true });
    bytes -= cover.size;
    count--;
  }
  checkedDirectories.add(directory);
};

const findCachedCover = async (path: string): Promise<boolean> => {
  const file = await stat(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  if (!file?.isFile()) return false;
  if (file.size === 0 || file.size > MAX_COVER_BYTES || Date.now() - file.mtimeMs > COVER_CACHE_MAX_AGE_MS) {
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
    return findCachedCover(join(directory, filename));
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
    if (await findCachedCover(path)) return;
    await mkdir(directory, { recursive: true });
    await pruneCache(directory, content.byteLength, 1);
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
