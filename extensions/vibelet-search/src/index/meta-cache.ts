import * as fs from "fs";
import * as path from "path";
import { warn } from "../logger";
import type { SessionMeta } from "../types";

/**
 * Cached meta for one session, plus the file fingerprint used to decide whether the
 * cached meta is still fresh. mtime + size together (double-check) so a content change
 * that preserved mtime still invalidates.
 */
export interface CachedSessionMeta {
  meta: SessionMeta;
  fileMtime: number;
  fileSize: number;
}

export interface MetaCache {
  load(): Map<string, CachedSessionMeta>;
  save(entries: Map<string, CachedSessionMeta>): void;
}

const CACHE_VERSION = 1;

/**
 * A JSON file under Raycast's `supportPath` holding `SessionMeta`s for one source.
 * Corrupt / version-mismatched files degrade silently to an empty cache (full rescan).
 */
export function createMetaCache(cacheDir: string, scope: string): MetaCache {
  const filePath = path.join(cacheDir, `meta-${scope}.json`);
  return {
    load() {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw) as {
          version?: number;
          entries?: Array<{ key: string; meta: SessionMeta; fileMtime: number; fileSize: number }>;
        };
        if (!parsed || parsed.version !== CACHE_VERSION || !Array.isArray(parsed.entries)) return new Map();
        const m = new Map<string, CachedSessionMeta>();
        for (const e of parsed.entries) {
          if (e && typeof e.key === "string" && e.meta && typeof e.meta.id === "string") {
            m.set(e.key, { meta: e.meta, fileMtime: Number(e.fileMtime) || 0, fileSize: Number(e.fileSize) || 0 });
          }
        }
        return m;
      } catch {
        return new Map();
      }
    },
    save(entries) {
      const data = {
        version: CACHE_VERSION,
        entries: [...entries].map(([key, e]) => ({
          key,
          meta: e.meta,
          fileMtime: e.fileMtime,
          fileSize: e.fileSize,
        })),
      };
      try {
        fs.mkdirSync(cacheDir, { recursive: true });
        const tmp = filePath + ".tmp";
        fs.writeFileSync(tmp, JSON.stringify(data));
        fs.renameSync(tmp, filePath);
      } catch (e) {
        warn("meta-cache save failed:", e);
      }
    },
  };
}

/**
 * A candidate discovered on disk by a scanner. `meta` may carry placeholder title/
 * timestamp — `extract` is only called when the file actually changed, to fill them in.
 */
export interface ScanCandidate<C = undefined> {
  /** Stable identity key, `claude:<id>` / `codex:<id>` — see `index/keys.ts`. */
  key: string;
  filePath: string;
  fileMtime: number;
  fileSize: number;
  meta: SessionMeta;
  ctx: C;
}

export interface ScanResult {
  metas: SessionMeta[];
  /** keys whose meta was re-extracted because the file changed or is new */
  changedKeys: string[];
  /** keys present in the cache but no longer on disk */
  removedKeys: string[];
}

/**
 * Generic incremental scan:
 * 1. Compare each candidate's file fingerprint against the cache.
 * 2. Fresh entries are reused verbatim (no re-reading file contents).
 * 3. New/changed files go through `extract`; gone files are dropped from the cache.
 * 4. Persist the merged cache, atomically.
 */
export async function scanWithCache<C>(
  cache: MetaCache,
  candidates: ScanCandidate<C>[],
  extract: (c: ScanCandidate<C>) => Promise<SessionMeta>,
): Promise<ScanResult> {
  const cached = cache.load();
  const changedKeys: string[] = [];
  const removedKeys: string[] = [];
  const metas: SessionMeta[] = [];
  const updated = new Map<string, CachedSessionMeta>();

  for (const c of candidates) {
    const prev = cached.get(c.key);
    if (prev && prev.fileMtime === c.fileMtime && prev.fileSize === c.fileSize) {
      updated.set(c.key, prev);
      metas.push(prev.meta);
    } else {
      const meta = await extract(c);
      updated.set(c.key, { meta, fileMtime: c.fileMtime, fileSize: c.fileSize });
      metas.push(meta);
      changedKeys.push(c.key);
    }
  }

  for (const [key] of cached) {
    if (!updated.has(key)) removedKeys.push(key);
  }

  cache.save(updated);
  return { metas, changedKeys, removedKeys };
}
