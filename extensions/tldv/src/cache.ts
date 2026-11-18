import { Cache } from "@raycast/api";
import { CacheEntry } from "./types";

const cache = new Cache();

// Default TTLs
export const DEFAULT_MEETINGS_CACHE_TTL = 15 * 60 * 1000; // 15 min
export const DEFAULT_DETAIL_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Cache key prefixes
const CACHE_PREFIX = "tldv";
const MEETINGS_PREFIX = `${CACHE_PREFIX}-meetings`;
const TRANSCRIPT_PREFIX = `${CACHE_PREFIX}-transcript`;
const HIGHLIGHTS_PREFIX = `${CACHE_PREFIX}-highlights`;

// Generic cache get
export function getCached<T>(key: string, ttlMs: number): T | null {
  const raw = cache.get(key);
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.timestamp > ttlMs) return null;
    return entry.data;
  } catch {
    return null;
  }
}

// Generic cache set
export function setCache<T>(key: string, data: T): void {
  cache.set(key, JSON.stringify({ data, timestamp: Date.now() }));
}

// Clear specific cache entry
export function clearCache(key: string): void {
  cache.remove(key);
}

// Clear all caches for a workspace
export function clearWorkspaceCache(workspaceName: string): void {
  const meetingsKey = getMeetingsCacheKey(workspaceName);
  clearCache(meetingsKey);
}

// Clear all tldv caches
export function clearAllCaches(): void {
  // Note: Raycast Cache doesn't have a clear all method
  // We can only remove known keys
  // This is a limitation - in practice, caches will expire naturally
}

// Get cache key for meetings
export function getMeetingsCacheKey(workspaceName: string): string {
  return `${MEETINGS_PREFIX}-${workspaceName}`;
}

// Get cache key for transcript
export function getTranscriptCacheKey(meetingId: string): string {
  return `${TRANSCRIPT_PREFIX}-${meetingId}`;
}

// Get cache key for highlights
export function getHighlightsCacheKey(meetingId: string): string {
  return `${HIGHLIGHTS_PREFIX}-${meetingId}`;
}

// Get cached meetings
export function getCachedMeetings<T>(
  workspaceName: string,
  ttlMs: number,
): T | null {
  return getCached<T>(getMeetingsCacheKey(workspaceName), ttlMs);
}

// Set cached meetings
export function setCachedMeetings<T>(workspaceName: string, data: T): void {
  setCache(getMeetingsCacheKey(workspaceName), data);
}

// Get cached transcript
export function getCachedTranscript<T>(
  meetingId: string,
  ttlMs: number,
): T | null {
  return getCached<T>(getTranscriptCacheKey(meetingId), ttlMs);
}

// Set cached transcript
export function setCachedTranscript<T>(meetingId: string, data: T): void {
  setCache(getTranscriptCacheKey(meetingId), data);
}

// Get cached highlights
export function getCachedHighlights<T>(
  meetingId: string,
  ttlMs: number,
): T | null {
  return getCached<T>(getHighlightsCacheKey(meetingId), ttlMs);
}

// Set cached highlights
export function setCachedHighlights<T>(meetingId: string, data: T): void {
  setCache(getHighlightsCacheKey(meetingId), data);
}

// Check if cache is stale (for background refresh)
export function isCacheStale(key: string, ttlMs: number): boolean {
  const raw = cache.get(key);
  if (!raw) return true;

  try {
    const entry = JSON.parse(raw) as CacheEntry<unknown>;
    return Date.now() - entry.timestamp > ttlMs;
  } catch {
    return true;
  }
}
