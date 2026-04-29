import { environment } from "@raycast/api";
import { createHash } from "crypto";
import { mkdirSync } from "fs";
import { mkdir, readdir, rename, rm, stat, utimes, writeFile } from "fs/promises";
import { join } from "path";
import { useEffect, useState } from "react";
import { api } from "./client";

const THUMB_DIR = join(environment.supportPath, "thumbnails");
const SWEEP_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CONCURRENCY = 6;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const KNOWN_EXTS = Array.from(new Set(Object.values(EXT_BY_TYPE)));

try {
  mkdirSync(THUMB_DIR, { recursive: true });
} catch {
  // ignore
}

void sweepOnce();

async function sweepOnce(): Promise<void> {
  try {
    const entries = await readdir(THUMB_DIR);
    const now = Date.now();
    await Promise.all(
      entries.map(async (name) => {
        const p = join(THUMB_DIR, name);
        try {
          const s = await stat(p);
          if (now - s.mtimeMs > SWEEP_MAX_AGE_MS) await rm(p, { force: true });
        } catch {
          // ignore
        }
      }),
    );
  } catch {
    // ignore
  }
}

function extForContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  const base = contentType.split(";")[0].trim().toLowerCase();
  return EXT_BY_TYPE[base] ?? null;
}

function cacheKey(id: string, modified: string, size: string): string {
  return createHash("sha1").update(`${id}|${modified}|${size}`).digest("hex");
}

let active = 0;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < CONCURRENCY) {
    active++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => waiters.push(resolve));
}

function release(): void {
  const next = waiters.shift();
  if (next) next();
  else active--;
}

const inflight = new Map<string, Promise<string | null>>();

export interface ThumbnailKey {
  id: string;
  modified: string;
}

export async function ensureThumbnailCached(
  key: ThumbnailKey,
  size: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const hash = cacheKey(key.id, key.modified, size);

  const pending = inflight.get(hash);
  if (pending) return pending;

  const promise = resolveThumbnail(key, size, hash, signal).finally(() => {
    inflight.delete(hash);
  });
  inflight.set(hash, promise);
  return promise;
}

async function resolveThumbnail(
  key: ThumbnailKey,
  size: string,
  hash: string,
  signal?: AbortSignal,
): Promise<string | null> {
  for (const ext of KNOWN_EXTS) {
    const path = join(THUMB_DIR, `${hash}.${ext}`);
    try {
      await stat(path);
      const now = new Date();
      utimes(path, now, now).catch(() => {});
      return path;
    } catch {
      // try next extension
    }
  }
  return fetchAndStore(key, size, hash, signal);
}

async function fetchAndStore(
  key: ThumbnailKey,
  size: string,
  hash: string,
  signal?: AbortSignal,
): Promise<string | null> {
  await acquire();
  try {
    const response = await api.getRaw(`/objects/${encodeURIComponent(key.id)}/thumbnail`, {
      query: { size },
      signal,
    });
    const ext = extForContentType(response.headers.get("content-type"));
    if (!ext) return null;
    const buf = Buffer.from(await response.arrayBuffer());
    const finalPath = join(THUMB_DIR, `${hash}.${ext}`);
    const tmpPath = `${finalPath}.tmp`;
    await mkdir(THUMB_DIR, { recursive: true });
    await writeFile(tmpPath, buf);
    await rename(tmpPath, finalPath);
    return finalPath;
  } catch {
    return null;
  } finally {
    release();
  }
}

export function useThumbnail(
  obj: { id: string; modified: string } | undefined,
  size: string,
): { path: string | null; isLoading: boolean } {
  const [path, setPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const id = obj?.id;
  const modified = obj?.modified;

  useEffect(() => {
    if (!id || !modified) {
      setPath(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setIsLoading(true);
    ensureThumbnailCached({ id, modified }, size, controller.signal)
      .then((p) => {
        if (cancelled) return;
        setPath(p);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setPath(null);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id, modified, size]);

  return { path, isLoading };
}
