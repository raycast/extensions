/**
 * Cache-related types
 * Centralized definitions for caching mechanisms and storage
 */

export interface CachedItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
  version?: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
  enableStorage?: boolean; // Whether to persist to localStorage
  storageKey?: string; // Key for localStorage
  version?: string; // Cache version for invalidation
}

export interface CacheStats {
  totalItems: number;
  totalSize: number; // Approximate size in bytes
  hitRate: number; // Cache hit rate percentage
  missRate: number; // Cache miss rate percentage
  oldestItem?: string; // Key of oldest item
  newestItem?: string; // Key of newest item
}

export interface CacheStatsItem {
  count: number;
  size: number;
  hitRate: number;
  lastAccessed: string;
}

// Domain-specific cache interfaces
export interface UserSettings {
  apiKey?: string;
  defaultLanguage?: string;
  autoSave?: boolean;
  theme?: "system" | "light" | "dark";
  notifications?: boolean;
  debugMode?: boolean;
  lastSandboxId?: string;
  executionTimeout?: number;
  preferences?: Record<string, unknown>;
}

export interface FileInfo {
  name: string;
  path: string;
  type: "file" | "directory" | "symlink";
  size: number;
  modified: string;
  permissions: string;
  isHidden: boolean;
  content?: string; // Cached file content for small files
  checksum?: string; // For cache invalidation
}

export interface FileSystemCache {
  sandboxId: string;
  currentPath: string;
  files: FileInfo[];
  timestamp: number;
  breadcrumbs: Array<{
    name: string;
    path: string;
  }>;
}

// Cache invalidation and management
export interface CacheInvalidationOptions {
  pattern?: string | RegExp; // Pattern to match keys
  olderThan?: number; // Invalidate items older than this timestamp
  version?: string; // Invalidate items with different version
  force?: boolean; // Force invalidation regardless of TTL
}

export interface CacheEntry<T> {
  key: string;
  data: T;
  metadata: {
    timestamp: number;
    ttl: number;
    accessCount: number;
    lastAccessed: number;
    size: number;
    version?: string;
  };
}

export interface CacheManager<T> {
  get(key: string): T | null;
  set(key: string, value: T, options?: CacheOptions): void;
  delete(key: string): boolean;
  clear(): void;
  invalidate(options: CacheInvalidationOptions): number; // Returns count of invalidated items
  getStats(): CacheStats;
  getAllKeys(): string[];
  has(key: string): boolean;
  refresh(key: string): Promise<T | null>; // Async refresh of cached item
}

// Specialized cache types
export interface ApiCache extends CacheManager<unknown> {
  // API-specific caching methods
  cacheResponse(url: string, response: unknown, ttl?: number): void;
  getCachedResponse(url: string): unknown | null;
  invalidateEndpoint(endpoint: string): void;
}

export interface ComponentCache {
  // Component state caching
  saveComponentState(componentId: string, state: Record<string, unknown>): void;
  getComponentState(componentId: string): Record<string, unknown> | null;
  clearComponentState(componentId: string): void;
}

export interface PersistentCache extends CacheManager<unknown> {
  // Persistent storage methods
  sync(): Promise<void>; // Sync with persistent storage
  backup(): Promise<void>; // Create backup of cache
  restore(): Promise<void>; // Restore from backup
  export(): Promise<string>; // Export cache as JSON
  import(data: string): Promise<void>; // Import cache from JSON
}
