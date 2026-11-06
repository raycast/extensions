import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { environment } from "@raycast/api";
import type { ApiSave, ApiThumbnailSize } from "pond-api";
import { useCallback, useEffect, useRef, useState } from "react";
import { pond } from "../api/client";

const EXTENSIONS = new Map([
  ["image/webp", "webp"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/gif", "gif"],
  ["image/avif", "avif"],
]);

const LIMITS = { small: 2000, medium: 400, large: 100, original: 50 } satisfies Record<ApiThumbnailSize, number>;
const CONCURRENCY = 6;
const SAFE_ID = /^[\w-]+$/;
const CACHE_TTL_MS = 5 * 60_000;

type Keyed = Pick<ApiSave, "id" | "libraryId" | "thumbnail">;

interface CachedThumbnail {
  path: string;
  modified: number;
}

const caches = new Map<ApiThumbnailSize, Promise<Map<string, CachedThumbnail>>>();
const downloads = new Map<string, Promise<string | null>>();

function directory(size: ApiThumbnailSize): string {
  return join(environment.supportPath, "thumbnails", size);
}

export function thumbnailKey(save: Pick<ApiSave, "id" | "libraryId">): string {
  return `${save.libraryId}-${save.id}`;
}

async function readCache(size: ApiThumbnailSize): Promise<Map<string, CachedThumbnail>> {
  const folder = directory(size);
  await mkdir(folder, { recursive: true });
  const files = await Promise.all(
    (await readdir(folder)).map(async (name) => {
      const path = join(folder, name);
      return { name, path, modified: (await stat(path).catch(() => null))?.mtimeMs ?? 0 };
    }),
  );
  files.sort((a, b) => b.modified - a.modified);
  // Prune only at initialization, before open views can retain paths to these files.
  await Promise.all(files.slice(LIMITS[size]).map((file) => rm(file.path, { force: true })));
  return new Map(files.slice(0, LIMITS[size]).map((file) => [file.name.replace(/\.[^.]+$/, ""), file]));
}

function cached(size: ApiThumbnailSize): Promise<Map<string, CachedThumbnail>> {
  let cache = caches.get(size);
  if (!cache) {
    cache = readCache(size).catch((error) => {
      caches.delete(size);
      throw error;
    });
    caches.set(size, cache);
  }
  return cache;
}

function isFresh(thumbnail: CachedThumbnail): boolean {
  return Date.now() - thumbnail.modified < CACHE_TTL_MS;
}

async function loadThumbnail(save: Keyed, size: ApiThumbnailSize): Promise<string | null> {
  const cache = await cached(size);
  const key = thumbnailKey(save);
  const existing = cache.get(key);
  if (existing && isFresh(existing)) return existing.path;

  const thumbnail = await pond().thumbnail(save.id, size);
  if (!thumbnail) return null;
  const extension = EXTENSIONS.get(thumbnail.type.replace(/;.*$/, ""));
  if (!extension) return null;
  const path = join(directory(size), `${key}.${extension}`);
  await writeFile(path, thumbnail.bytes);
  cache.set(key, { path, modified: Date.now() });
  if (existing && existing.path !== path) await rm(existing.path, { force: true });
  return path;
}

export async function downloadThumbnail(save: Keyed, size: ApiThumbnailSize): Promise<string | null> {
  if (!save.thumbnail || !SAFE_ID.test(save.id) || !SAFE_ID.test(save.libraryId)) return null;
  const key = `${size}:${thumbnailKey(save)}`;
  let download = downloads.get(key);
  if (!download) {
    download = loadThumbnail(save, size).finally(() => downloads.delete(key));
    downloads.set(key, download);
  }
  return download;
}

/** Cached paths and a refresh action for missing images. Missing keys are still loading. */
export function useThumbnails(saves: readonly Keyed[], size: ApiThumbnailSize) {
  const [paths, setPaths] = useState<ReadonlyMap<string, string | null> | null>(null);
  const requested = useRef(new Set<string>());
  const retry = useCallback(() => {
    setPaths((current) => (current ? new Map([...current].filter(([, path]) => path !== null)) : null));
  }, []);

  useEffect(() => {
    let active = true;
    void cached(size)
      .catch(() => new Map<string, CachedThumbnail>())
      .then((found) => {
        if (active)
          setPaths(new Map([...found].filter(([, file]) => isFresh(file)).map(([key, file]) => [key, file.path])));
      });
    return () => {
      active = false;
    };
  }, [size]);

  useEffect(() => {
    if (!paths) return;
    const queue = saves.filter((save) => {
      const key = thumbnailKey(save);
      return save.thumbnail && !paths.has(key) && !requested.current.has(key);
    });
    for (const save of queue) requested.current.add(thumbnailKey(save));

    async function work() {
      for (let save = queue.shift(); save !== undefined; save = queue.shift()) {
        const target = save;
        const path = await downloadThumbnail(target, size).catch(() => null);
        requested.current.delete(thumbnailKey(target));
        setPaths((current) => new Map(current ?? []).set(thumbnailKey(target), path));
      }
    }
    for (let worker = 0; worker < CONCURRENCY; worker += 1) void work();
  }, [saves, paths, size]);

  return { paths: paths ?? new Map<string, string | null>(), retry };
}
