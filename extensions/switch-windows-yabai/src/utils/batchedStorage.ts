/**
 * Batched storage utility to reduce LocalStorage operations
 * Groups multiple storage operations into batches for improved performance
 */

import { LocalStorage } from "@raycast/api";
import { performanceMonitor } from "./performanceMonitor";

interface PendingWrite {
  key: string;
  value: unknown;
  timestamp: number;
}

export class BatchedStorage {
  private pendingWrites = new Map<string, PendingWrite>();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly batchDelay: number;
  private readonly maxBatchSize: number;

  constructor(batchDelayMs: number = 500, maxBatchSize: number = 10) {
    this.batchDelay = batchDelayMs;
    this.maxBatchSize = maxBatchSize;
  }

  /**
   * Set an item to be written in the next batch
   */
  setItem(key: string, value: unknown): void {
    // Add to pending writes
    this.pendingWrites.set(key, {
      key,
      value,
      timestamp: Date.now(),
    });

    // If we've reached max batch size, flush immediately
    if (this.pendingWrites.size >= this.maxBatchSize) {
      this.flushBatch();
      return;
    }

    // Schedule batch flush if not already scheduled
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, this.batchDelay);
    }
  }

  /**
   * Get an item from LocalStorage (no batching needed for reads)
   */
  async getItem<T>(key: string): Promise<T | undefined> {
    // Check if there's a pending write for this key first
    const pendingWrite = this.pendingWrites.get(key);
    if (pendingWrite) {
      return pendingWrite.value as T;
    }

    // Otherwise read from LocalStorage
    return performanceMonitor.measureAsync("storage-read", async () => {
      return await LocalStorage.getItem<T>(key);
    });
  }

  /**
   * Remove an item from LocalStorage
   */
  async removeItem(key: string): Promise<void> {
    // Remove from pending writes if it exists
    this.pendingWrites.delete(key);

    return performanceMonitor.measureAsync("storage-remove", async () => {
      await LocalStorage.removeItem(key);
    });
  }

  /**
   * Flush all pending writes to LocalStorage immediately
   */
  private async flushBatch(): Promise<void> {
    if (this.pendingWrites.size === 0) return;

    // Clear the batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Get all pending writes
    const writes = Array.from(this.pendingWrites.values());
    this.pendingWrites.clear();

    // Perform all writes
    const startTime = performance.now();

    try {
      await Promise.all(
        writes.map(async (write) => {
          try {
            await LocalStorage.setItem(write.key, JSON.stringify(write.value));
          } catch (error) {
            console.error(`Failed to write ${write.key} to LocalStorage:`, error);
            // Re-add failed write for retry
            this.pendingWrites.set(write.key, write);
          }
        }),
      );

      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric("storage-batch-write", duration);

      console.log(`📦 Batched ${writes.length} storage operations in ${duration.toFixed(2)}ms`);
    } catch (error) {
      console.error("Batch storage operation failed:", error);
    }
  }

  /**
   * Force flush all pending operations immediately
   */
  async flush(): Promise<void> {
    await this.flushBatch();
  }

  /**
   * Get the number of pending operations
   */
  getPendingCount(): number {
    return this.pendingWrites.size;
  }

  /**
   * Clear all pending operations without writing
   */
  clearPending(): void {
    this.pendingWrites.clear();
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Cleanup method to be called on component unmount
   */
  async cleanup(): Promise<void> {
    await this.flush();
    this.clearPending();
  }
}

/**
 * High-level storage hooks with batching capabilities
 */
export class StorageManager {
  private batchedStorage: BatchedStorage;
  private cache = new Map<string, { value: unknown; timestamp: number }>();
  private readonly cacheTimeout: number;

  constructor(batchDelayMs: number = 500, cacheTimeoutMs: number = 30000) {
    this.batchedStorage = new BatchedStorage(batchDelayMs);
    this.cacheTimeout = cacheTimeoutMs;
  }

  /**
   * Set a value with batching
   */
  set(key: string, value: unknown): void {
    // Update cache
    this.cache.set(key, { value, timestamp: Date.now() });

    // Schedule batch write
    this.batchedStorage.setItem(key, value);
  }

  /**
   * Get a value with caching
   */
  async get<T>(key: string): Promise<T | undefined> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value as T;
    }

    // Fetch from storage
    const value = await this.batchedStorage.getItem<T>(key);

    // Update cache
    if (value !== undefined) {
      this.cache.set(key, { value, timestamp: Date.now() });
    }

    return value;
  }

  /**
   * Remove a value
   */
  async remove(key: string): Promise<void> {
    this.cache.delete(key);
    await this.batchedStorage.removeItem(key);
  }

  /**
   * Force flush all pending writes
   */
  async flush(): Promise<void> {
    await this.batchedStorage.flush();
  }

  /**
   * Get statistics about storage operations
   */
  getStats(): { pending: number; cached: number } {
    return {
      pending: this.batchedStorage.getPendingCount(),
      cached: this.cache.size,
    };
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    await this.batchedStorage.cleanup();
    this.cache.clear();
  }
}

// Export singleton instances
export const batchedStorage = new BatchedStorage();
export const storageManager = new StorageManager();

// Setup periodic cache cleanup
setInterval(() => {
  storageManager.clearExpiredCache();
}, 60000); // Clean every minute
