import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { environment } from "@raycast/api";
import type { ApiSave, ApiThumbnailSize } from "pond-api";
import { useEffect, useRef, useState } from "react";
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

type Keyed = Pick<ApiSave, "id" | "libraryId" | "thumbnail">;

function directory(size: ApiThumbnailSize): string {
  return join(environment.supportPath, "thumbnails", size);
}

export function thumbnailKey(save: Pick<ApiSave, "id" | "libraryId">): string {
  return `${save.libraryId}-${save.id}`;
}

async function cached(size: ApiThumbnailSize): Promise<Map<string, string>> {
  const folder = directory(size);
  await mkdir(folder, { recursive: true });
  const files = await Promise.all(
    (await readdir(folder)).map(async (name) => {
      const path = join(folder, name);
      return { name, path, modified: (await stat(path).catch(() => null))?.mtimeMs ?? 0 };
    }),
  );
  files.sort((a, b) => b.modified - a.modified);
  await Promise.all(files.slice(LIMITS[size]).map((file) => rm(file.path, { force: true })));
  return new Map(files.slice(0, LIMITS[size]).map((file) => [file.name.replace(/\.[^.]+$/, ""), file.path]));
}

export async function downloadThumbnail(save: Keyed, size: ApiThumbnailSize): Promise<string | null> {
  if (!save.thumbnail || !SAFE_ID.test(save.id) || !SAFE_ID.test(save.libraryId)) return null;
  const thumbnail = await pond().thumbnail(save.id, size);
  if (!thumbnail) return null;
  const extension = EXTENSIONS.get(thumbnail.type.replace(/;.*$/, ""));
  if (!extension) return null;
  const folder = directory(size);
  await mkdir(folder, { recursive: true });
  const path = join(folder, `${thumbnailKey(save)}.${extension}`);
  await writeFile(path, thumbnail.bytes);
  return path;
}

/** Maps thumbnail keys to a cached path, `null` for no image, or nothing while loading. */
export function useThumbnails(saves: readonly Keyed[], size: ApiThumbnailSize): ReadonlyMap<string, string | null> {
  const [paths, setPaths] = useState<ReadonlyMap<string, string | null> | null>(null);
  const requested = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    void cached(size)
      .catch(() => new Map<string, string>())
      .then((found) => {
        if (active) setPaths(found);
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
        setPaths((current) => new Map(current ?? []).set(thumbnailKey(target), path));
      }
    }
    for (let worker = 0; worker < CONCURRENCY; worker += 1) void work();
  }, [saves, paths, size]);

  return paths ?? new Map();
}
