import { Cache } from "@raycast/api";
import {
  CACHE_KEYS,
  CACHE_STALE_THRESHOLD_MS,
  CACHE_VERSION,
} from "./constants";
import type {
  Collection,
  Page,
  StatsResponse,
  TagIndexResponse,
} from "./types";

const cache = new Cache();

function isVersionValid(): boolean {
  const v = cache.get(CACHE_KEYS.version);
  return v === String(CACHE_VERSION);
}

/** Read cached pages synchronously — used as `initialData` for instant render. */
export function getInitialPages(): Page[] {
  if (!isVersionValid()) return [];
  const raw = cache.get(CACHE_KEYS.pages);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Page[];
  } catch {
    return [];
  }
}

/** Write pages to cache (called after API fetch or by background sync). */
export function setCachedPages(pages: Page[]) {
  cache.set(CACHE_KEYS.pages, JSON.stringify(pages));
  cache.set(CACHE_KEYS.updatedAt, new Date().toISOString());
  cache.set(CACHE_KEYS.version, String(CACHE_VERSION));
}

// ── Tags cache ────────────────────────────────────────────────

/** Read cached tags synchronously — used as `initialData` for instant render. */
export function getInitialTags(): TagIndexResponse | null {
  if (!isVersionValid()) return null;
  const raw = cache.get(CACHE_KEYS.tags);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TagIndexResponse;
  } catch {
    return null;
  }
}

/** Write tags to cache. */
export function setCachedTags(tags: TagIndexResponse) {
  cache.set(CACHE_KEYS.tags, JSON.stringify(tags));
  cache.set(CACHE_KEYS.updatedAt, new Date().toISOString());
  cache.set(CACHE_KEYS.version, String(CACHE_VERSION));
}

// ── Collections cache ─────────────────────────────────────────

/** Read cached collections synchronously. */
export function getInitialCollections(): Collection[] {
  if (!isVersionValid()) return [];
  const raw = cache.get(CACHE_KEYS.collections);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Collection[];
  } catch {
    return [];
  }
}

/** Write collections to cache. */
export function setCachedCollections(collections: Collection[]) {
  cache.set(CACHE_KEYS.collections, JSON.stringify(collections));
  cache.set(CACHE_KEYS.updatedAt, new Date().toISOString());
  cache.set(CACHE_KEYS.version, String(CACHE_VERSION));
}

// ── Stats cache ──────────────────────────────────────────────

/** Read cached stats synchronously — used as `initialData` for instant render. */
export function getInitialStats(): StatsResponse | null {
  if (!isVersionValid()) return null;
  const raw = cache.get(CACHE_KEYS.stats);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StatsResponse;
  } catch {
    return null;
  }
}

/** Write stats to cache. */
export function setCachedStats(stats: StatsResponse) {
  cache.set(CACHE_KEYS.stats, JSON.stringify(stats));
  cache.set(CACHE_KEYS.updatedAt, new Date().toISOString());
  cache.set(CACHE_KEYS.version, String(CACHE_VERSION));
}

// ── Cache metadata ────────────────────────────────────────────

/** Returns milliseconds since cache was last updated, or Infinity if never cached. */
export function getCacheAge(): number {
  const updatedAt = cache.get(CACHE_KEYS.updatedAt);
  if (!updatedAt) return Infinity;
  return Date.now() - new Date(updatedAt).getTime();
}

/** Human-readable cache age string, or null if cache is fresh enough. */
export function getCacheAgeLabel(): string | null {
  const ageMs = getCacheAge();
  if (ageMs < CACHE_STALE_THRESHOLD_MS) return null;

  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 60) return `Last synced ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last synced ${hours}h ago`;
  return `Last synced ${Math.floor(hours / 24)}d ago`;
}
