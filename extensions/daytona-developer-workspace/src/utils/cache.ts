/**
 * Daytona State Management with Raycast Cache
 * Task 16.4: Centralized caching for shared data across commands
 */

import { Cache } from "@raycast/api";

// Cache instance singleton
const cache = new Cache();

// Cache key constants
export const CACHE_KEYS = {
  SANDBOXES: "daytona.sandboxes",
  ACTIVE_SANDBOX: "daytona.activeSandbox",
  USER_SETTINGS: "daytona.userSettings",
  EXECUTION_HISTORY: "daytona.executionHistory",
  RECENT_FILES: "daytona.recentFiles",
  GIT_STATUS: "daytona.gitStatus",
} as const;

// Cache expiration times (in milliseconds)
const CACHE_TTL = {
  SHORT: 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
} as const;

export interface CachedItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Set data in cache with TTL
 */
export function setCacheData<T>(key: string, data: T, ttl: number = CACHE_TTL.MEDIUM): void {
  const cachedItem: CachedItem<T> = {
    data,
    timestamp: Date.now(),
    ttl,
  };

  cache.set(key, JSON.stringify(cachedItem));
  console.log(`📦 Cached data for key: ${key} (TTL: ${ttl / 1000}s)`);
}

/**
 * Get data from cache, respecting TTL
 */
export function getCacheData<T>(key: string): T | null {
  try {
    const cached = cache.get(key);
    if (!cached) {
      console.log(`📦 Cache miss for key: ${key}`);
      return null;
    }

    const cachedItem: CachedItem<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache has expired
    if (now - cachedItem.timestamp > cachedItem.ttl) {
      console.log(`📦 Cache expired for key: ${key}`);
      cache.remove(key);
      return null;
    }

    console.log(`📦 Cache hit for key: ${key}`);
    return cachedItem.data;
  } catch (error) {
    console.error(`📦 Error reading cache for key ${key}:`, error);
    cache.remove(key);
    return null;
  }
}

/**
 * Remove specific key from cache
 */
export function removeCacheData(key: string): void {
  cache.remove(key);
  console.log(`📦 Removed cache for key: ${key}`);
}

/**
 * Clear all cache data
 */
export function clearAllCache(): void {
  cache.clear();
  console.log(`📦 Cleared all cache data`);
}

/**
 * Check if data exists in cache (ignoring TTL)
 */
export function hasCacheData(key: string): boolean {
  return cache.has(key);
}

// Specific cache utilities for Daytona data

// Define sandbox type interface
interface SandboxInfo {
  id: string;
  name?: string;
  status?: string;
  createdAt?: string;
}

/**
 * Cache sandbox list data
 */
export function cacheSandboxes(sandboxes: SandboxInfo[]): void {
  setCacheData(CACHE_KEYS.SANDBOXES, sandboxes, CACHE_TTL.MEDIUM);
}

/**
 * Get cached sandbox list
 */
export function getCachedSandboxes(): SandboxInfo[] | null {
  return getCacheData<SandboxInfo[]>(CACHE_KEYS.SANDBOXES);
}

/**
 * Cache active sandbox ID
 */
export function cacheActiveSandbox(sandboxId: string): void {
  setCacheData(CACHE_KEYS.ACTIVE_SANDBOX, sandboxId, CACHE_TTL.LONG);
}

/**
 * Get cached active sandbox ID
 */
export function getCachedActiveSandbox(): string | null {
  return getCacheData<string>(CACHE_KEYS.ACTIVE_SANDBOX);
}

// Define execution history type interface
interface ExecutionHistoryItem {
  code: string;
  result: string;
  timestamp: number;
  success: boolean;
}

/**
 * Cache execution history
 */
export function cacheExecutionHistory(history: ExecutionHistoryItem[]): void {
  setCacheData(CACHE_KEYS.EXECUTION_HISTORY, history, CACHE_TTL.LONG);
}

/**
 * Get cached execution history
 */
export function getCachedExecutionHistory(): ExecutionHistoryItem[] | null {
  return getCacheData<ExecutionHistoryItem[]>(CACHE_KEYS.EXECUTION_HISTORY);
}

// Define user settings type interface
interface UserSettings {
  apiKey?: string;
  defaultTimeout?: number;
  preferredLanguage?: string;
  autoCleanup?: boolean;
}

/**
 * Cache user settings
 */
export function cacheUserSettings(settings: UserSettings): void {
  setCacheData(CACHE_KEYS.USER_SETTINGS, settings, CACHE_TTL.LONG);
}

/**
 * Get cached user settings
 */
export function getCachedUserSettings(): UserSettings | null {
  return getCacheData<UserSettings>(CACHE_KEYS.USER_SETTINGS);
}

// Define file info type interface
interface FileInfo {
  path: string;
  name: string;
  size?: number;
  modifiedAt?: string;
  type?: string;
}

/**
 * Cache recent files for file browser
 */
export function cacheRecentFiles(files: FileInfo[]): void {
  setCacheData(CACHE_KEYS.RECENT_FILES, files, CACHE_TTL.MEDIUM);
}

/**
 * Get cached recent files
 */
export function getCachedRecentFiles(): FileInfo[] | null {
  return getCacheData<FileInfo[]>(CACHE_KEYS.RECENT_FILES);
}

// Define git status type interface
interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead?: number;
  behind?: number;
}

/**
 * Cache git status information
 */
export function cacheGitStatus(status: GitStatus): void {
  setCacheData(CACHE_KEYS.GIT_STATUS, status, CACHE_TTL.SHORT);
}

/**
 * Get cached git status
 */
export function getCachedGitStatus(): GitStatus | null {
  return getCacheData<GitStatus>(CACHE_KEYS.GIT_STATUS);
}

/**
 * Invalidate related caches when sandbox changes
 */
export function invalidateSandboxCaches(): void {
  removeCacheData(CACHE_KEYS.SANDBOXES);
  removeCacheData(CACHE_KEYS.ACTIVE_SANDBOX);
  removeCacheData(CACHE_KEYS.RECENT_FILES);
  removeCacheData(CACHE_KEYS.GIT_STATUS);
  console.log(`📦 Invalidated sandbox-related caches`);
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): { [key: string]: { exists: boolean; age?: number } } {
  const stats: { [key: string]: { exists: boolean; age?: number } } = {};

  Object.entries(CACHE_KEYS).forEach(([name, key]) => {
    const hasData = hasCacheData(key);
    let age: number | undefined;

    if (hasData) {
      try {
        const cached = cache.get(key);
        if (cached) {
          const cachedItem = JSON.parse(cached);
          age = Date.now() - cachedItem.timestamp;
        }
      } catch (error) {
        // Ignore parse errors
      }
    }

    stats[name] = { exists: hasData, age };
  });

  return stats;
}
