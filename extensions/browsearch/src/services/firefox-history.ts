import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { executeSQL } from "@raycast/utils";
import type { FirefoxProfile, MozPlacesRow } from "../types";
import { buildMozPlacesQuery, SUGGESTION_LIMIT } from "../constants";
import { isCacheStale } from "../utils/cache";

export { isCacheStale };

interface CacheEntry {
  readonly tempDb: string;
  lastMtime: number;
}

const dbCache = new Map<string, CacheEntry>();

function sourceMaxMtime(dbPath: string): number {
  let max = 0;
  for (const ext of ["", "-wal", "-shm"]) {
    try {
      const m = fs.statSync(dbPath + ext).mtimeMs;
      if (m > max) max = m;
    } catch {
      // file absent — skip
    }
  }
  return max;
}

function profileCacheKey(dbPath: string): string {
  return crypto.createHash("md5").update(dbPath).digest("hex");
}

function getCachedDb(profile: FirefoxProfile): string {
  const key = profileCacheKey(profile.placesDbPath);
  const maxMtime = sourceMaxMtime(profile.placesDbPath);
  const existing = dbCache.get(key);

  if (existing && !isCacheStale(maxMtime, existing.lastMtime)) {
    return existing.tempDb;
  }

  const tempDb = existing?.tempDb ?? path.join(os.tmpdir(), `browsearch-${key}.sqlite`);

  fs.copyFileSync(profile.placesDbPath, tempDb);

  for (const ext of ["-wal", "-shm"]) {
    const src = profile.placesDbPath + ext;
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, tempDb + ext);
    } else {
      try {
        if (fs.existsSync(tempDb + ext)) fs.unlinkSync(tempDb + ext);
      } catch {
        // best-effort cleanup of stale sidecar
      }
    }
  }

  if (existing) {
    existing.lastMtime = maxMtime;
  } else {
    dbCache.set(key, { tempDb, lastMtime: maxMtime });
  }

  return tempDb;
}

export async function queryFirefoxHistory(
  profile: FirefoxProfile,
  term: string,
  options?: { limit?: number; signal?: AbortSignal },
): Promise<MozPlacesRow[]> {
  if (!term.trim()) return [];

  options?.signal?.throwIfAborted();

  const limit = options?.limit ?? SUGGESTION_LIMIT;
  const tempDb = getCachedDb(profile);

  options?.signal?.throwIfAborted();

  const query = buildMozPlacesQuery(term, limit);
  return await executeSQL<MozPlacesRow>(tempDb, query);
}
