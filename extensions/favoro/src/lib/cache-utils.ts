/**
 * Pure utility functions for cache operations.
 * These functions do not depend on Raycast APIs and are easily testable.
 */

import { CACHE_STALE_THRESHOLD_MS } from "./constants";
import type { CacheMetadata, CacheStatus } from "../types";

/**
 * Determines if the cache is stale based on the cacheUntil timestamp
 */
export function isCacheStale(metadata: CacheMetadata): boolean {
  const cacheUntil = new Date(metadata.cacheUntil).getTime();
  return Date.now() > cacheUntil;
}

/**
 * Determines if the cache should be refreshed based on the exportedAt timestamp
 * Uses CACHE_STALE_THRESHOLD_MS (15 minutes) as the threshold
 */
export function shouldRefreshCache(metadata: CacheMetadata): boolean {
  const exportedAt = new Date(metadata.exportedAt).getTime();
  return Date.now() - exportedAt > CACHE_STALE_THRESHOLD_MS;
}

/**
 * Determines the current cache status
 */
export function getCacheStatus(metadata: CacheMetadata | null, isLoading: boolean): CacheStatus {
  if (isLoading) {
    return "syncing";
  }
  if (!metadata) {
    return "empty";
  }
  if (isCacheStale(metadata) || shouldRefreshCache(metadata)) {
    return "stale";
  }
  return "fresh";
}

/**
 * Parses the exportedAt timestamp and returns a Date object
 */
export function getLastSyncedDate(metadata: CacheMetadata | null): Date | undefined {
  if (!metadata?.exportedAt) {
    return undefined;
  }
  return new Date(metadata.exportedAt);
}

/**
 * Formats the last synced time as a human-readable relative string
 */
export function formatLastSynced(date: Date | undefined): string {
  if (!date) {
    return "Never synced";
  }

  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
