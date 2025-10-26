/**
 * Optimized search utility with result caching and performance monitoring
 * Provides efficient fuzzy search with minimal re-computations
 */

import Fuse from "fuse.js";
import { performanceMonitor } from "./performanceMonitor";

interface SearchResult<T> {
  items: T[];
  totalCount: number;
  searchTime: number;
  cacheHit: boolean;
}

interface SearchCache<T> {
  query: string;
  results: T[];
  timestamp: number;
  dataHash: string;
}

export class OptimizedSearch<T> {
  private fuse: Fuse<T> | null = null;
  private data: T[] = [];
  private dataHash: string = "";
  private cache = new Map<string, SearchCache<T>>();
  private readonly cacheTimeout: number;
  private readonly maxCacheSize: number;

  constructor(
    private readonly fuseOptions: Fuse.IFuseOptions<T>,
    cacheTimeoutMs: number = 30000, // 30 seconds
    maxCacheSize: number = 50,
  ) {
    this.cacheTimeout = cacheTimeoutMs;
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Update the data and rebuild Fuse instance if necessary
   */
  updateData(newData: T[]): void {
    const newDataHash = this.calculateDataHash(newData);

    // Only rebuild if data actually changed
    if (newDataHash !== this.dataHash) {
      performanceMonitor.measure("search-data-update", () => {
        this.data = newData;
        this.dataHash = newDataHash;
        this.fuse = newData.length > 0 ? new Fuse(newData, this.fuseOptions) : null;

        // Clear cache when data changes
        this.cache.clear();

        console.log(`🔍 Updated search data with ${newData.length} items`);
      });
    }
  }

  /**
   * Perform optimized search with caching
   */
  search(query: string, limit?: number): SearchResult<T> {
    if (!query.trim()) {
      return {
        items: limit ? this.data.slice(0, limit) : this.data,
        totalCount: this.data.length,
        searchTime: 0,
        cacheHit: false,
      };
    }

    // Check cache first
    const cacheKey = `${query.toLowerCase()}:${limit || "all"}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      performanceMonitor.recordMetric("search-cache-hit", 0);
      return {
        items: cached.results,
        totalCount: cached.results.length,
        searchTime: 0,
        cacheHit: true,
      };
    }

    // Perform search
    return performanceMonitor.measure("search-operation", () => {
      let results: T[] = [];

      if (this.fuse) {
        // Try exact matches first for better performance
        const exactMatches = this.findExactMatches(query);

        if (exactMatches.length > 0) {
          results = exactMatches;
        } else {
          // Fall back to fuzzy search
          const fuseResults = this.fuse.search(query, { limit });
          results = fuseResults.map((result) => result.item);
        }
      }

      // Apply limit if specified
      const limitedResults = limit ? results.slice(0, limit) : results;

      // Cache the results
      this.setCachedResult(cacheKey, limitedResults);

      return {
        items: limitedResults,
        totalCount: results.length,
        searchTime: 0, // Will be filled by performance monitor
        cacheHit: false,
      };
    });
  }

  /**
   * Find exact matches in the data (faster than fuzzy search)
   */
  private findExactMatches(query: string): T[] {
    const lowerQuery = query.toLowerCase();
    const results: T[] = [];

    for (const item of this.data) {
      // Check each configured key for exact matches
      let isMatch = false;

      if (this.fuseOptions.keys) {
        for (const keyConfig of this.fuseOptions.keys) {
          const key = typeof keyConfig === "string" ? keyConfig : keyConfig.name;
          const value = this.getNestedValue(item, key);

          if (typeof value === "string" && value.toLowerCase().includes(lowerQuery)) {
            isMatch = true;
            break;
          }
        }
      }

      if (isMatch) {
        results.push(item);
      }
    }

    return results;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  /**
   * Calculate a simple hash of the data for change detection
   */
  private calculateDataHash(data: T[]): string {
    // Simple hash based on data length and first/last items
    if (data.length === 0) return "0";

    const first = data[0];
    const last = data[data.length - 1];

    return `${data.length}-${JSON.stringify(first).slice(0, 50)}-${JSON.stringify(last).slice(0, 50)}`;
  }

  /**
   * Get cached result if valid
   */
  private getCachedResult(cacheKey: string): SearchCache<T> | null {
    const cached = this.cache.get(cacheKey);

    if (cached) {
      // Check if cache is still valid
      const age = Date.now() - cached.timestamp;
      const isValid = age < this.cacheTimeout && cached.dataHash === this.dataHash;

      if (isValid) {
        return cached;
      } else {
        // Remove expired cache entry
        this.cache.delete(cacheKey);
      }
    }

    return null;
  }

  /**
   * Set cached result
   */
  private setCachedResult(cacheKey: string, results: T[]): void {
    // Limit cache size
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entries (simple FIFO)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(cacheKey, {
      query: cacheKey,
      results,
      timestamp: Date.now(),
      dataHash: this.dataHash,
    });
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get search statistics
   */
  getStats(): {
    dataSize: number;
    cacheSize: number;
    dataHash: string;
    cacheHitRate?: number;
  } {
    return {
      dataSize: this.data.length,
      cacheSize: this.cache.size,
      dataHash: this.dataHash,
    };
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    this.clearCache();
    this.fuse = null;
    this.data = [];
  }
}

/**
 * Factory function to create optimized search instances
 */
export function createOptimizedSearch<T>(
  fuseOptions: Fuse.IFuseOptions<T>,
  cacheTimeoutMs?: number,
  maxCacheSize?: number,
): OptimizedSearch<T> {
  return new OptimizedSearch(fuseOptions, cacheTimeoutMs, maxCacheSize);
}
