/**
 * Singleton cache manager to coordinate caching across all views
 *
 * Features:
 * - Prevents duplicate cache operations
 * - Shares cached data across all components
 * - Provides event-based updates when cache changes
 * - Handles cache invalidation and refresh
 */

import { showToast, Toast } from "@raycast/api";
import { listAllMeetings } from "../fathom/api";
import type { MeetingFilter, Meeting } from "../types/Types";
import { cacheMeeting, getAllCachedMeetings, pruneCache, type CachedMeetingData } from "./cache";
import { globalQueue } from "./requestQueue";
import { showContextualError } from "./errorHandling";
import { logger } from "@chrismessina/raycast-logger";

const CACHE_SIZE = 500; // Keep all meetings (auto-paginated from API)

type CacheListener = (meetings: CachedMeetingData[]) => void;

class CacheManager {
  private cachedMeetings: CachedMeetingData[] = [];
  private isLoaded = false;
  private isLoading = false;
  private isCaching = false;
  private listeners = new Set<CacheListener>();
  private lastApiDataHash: string | null = null;
  private lastFetchTime = 0;
  private lastCacheUpdateTime = 0;
  private CACHE_STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes - fetch fresh data if cache is older
  private FETCH_COOLDOWN = 5000; // 5 seconds minimum between fetches
  private nextCursor: string | undefined = undefined; // Pagination cursor for loading more
  private hasMoreMeetings = true; // Whether more meetings are available
  private isLoadingMore = false;

  /**
   * Subscribe to cache updates
   */
  subscribe(listener: CacheListener): () => void {
    this.listeners.add(listener);
    logger.log(`[CacheManager] Subscriber added (total: ${this.listeners.size})`);

    // Immediately notify with current data if loaded
    if (this.isLoaded) {
      listener(this.cachedMeetings);
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
      logger.log(`[CacheManager] Subscriber removed (total: ${this.listeners.size})`);
    };
  }

  /**
   * Notify all listeners of cache updates
   */
  private notifyListeners(): void {
    logger.log(`[CacheManager] Notifying ${this.listeners.size} listeners`);
    this.listeners.forEach((listener) => listener(this.cachedMeetings));
  }

  /**
   * Check if the cache is stale (needs fresh data from API)
   */
  isCacheStale(): boolean {
    if (!this.lastCacheUpdateTime) return true;
    const age = Date.now() - this.lastCacheUpdateTime;
    return age > this.CACHE_STALE_THRESHOLD;
  }

  /**
   * Get cache age in minutes for display
   */
  getCacheAgeMinutes(): number {
    if (!this.lastCacheUpdateTime) return 0;
    return Math.round((Date.now() - this.lastCacheUpdateTime) / 60000);
  }
  async loadCache(): Promise<CachedMeetingData[]> {
    if (this.isLoaded) {
      logger.log(`[CacheManager] Cache already loaded (${this.cachedMeetings.length} meetings)`);
      return this.cachedMeetings;
    }

    // Prevent concurrent loads
    if (this.isLoading) {
      logger.log("[CacheManager] Cache load already in progress, waiting...");
      // Wait for the current load to complete with timeout
      const maxWaitTime = 30000; // 30 seconds max wait
      const startTime = Date.now();
      while (this.isLoading) {
        if (Date.now() - startTime > maxWaitTime) {
          logger.error("[CacheManager] Timeout waiting for cache load, returning empty");
          this.isLoading = false;
          return [];
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return this.cachedMeetings;
    }

    this.isLoading = true;

    try {
      logger.log("[CacheManager] Loading cache from storage...");
      const cached = await getAllCachedMeetings();
      this.cachedMeetings = cached;
      this.isLoaded = true;
      logger.log(`[CacheManager] Loaded ${cached.length} cached meetings`);
      this.notifyListeners();
      return cached;
    } catch (error) {
      logger.error("[CacheManager] Error loading cache:", error);
      this.isLoaded = true;
      return [];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Fetch meetings from API and cache them (deduplicated)
   * @param filter - Meeting filter options
   * @param options - Additional options
   * @param options.force - If true, bypasses cooldown and data hash checks to ensure fresh data
   */
  async fetchAndCache(filter: MeetingFilter = {}, options: { force?: boolean } = {}): Promise<Meeting[]> {
    const { force = false } = options;

    // Check cooldown to prevent rapid re-fetches (unless forced)
    const now = Date.now();
    const timeSinceLastFetch = now - this.lastFetchTime;

    if (!force && timeSinceLastFetch < this.FETCH_COOLDOWN) {
      logger.log(
        `[CacheManager] Fetch cooldown active (${Math.round((this.FETCH_COOLDOWN - timeSinceLastFetch) / 1000)}s remaining), using cached data`,
      );
      return this.cachedMeetings.map((cached) => cached.meeting as Meeting);
    }

    // When forced, clear the data hash so new results always get cached
    if (force) {
      logger.log("[CacheManager] Forced fetch - clearing data hash for fresh results");
      this.lastApiDataHash = null;
    }

    // Create a unique key for this filter
    const filterKey = JSON.stringify(filter);
    const requestKey = `fetch-meetings:${filterKey}`;

    logger.log(`[CacheManager] Fetch request for filter: ${filterKey}`);

    // Update last fetch time
    this.lastFetchTime = now;

    // Use the global queue to deduplicate requests
    const result = await globalQueue.enqueue(
      requestKey,
      async () => {
        let progressToast: Toast | undefined;

        try {
          logger.log(`[CacheManager] Fetching all meetings for: ${filterKey}`);

          // Show progress toast during pagination
          progressToast = await showToast({
            style: Toast.Style.Animated,
            title: "Fetching meetings from Fathom API...",
          });

          const result = await listAllMeetings(
            filter,
            (fetched) => {
              if (progressToast) {
                progressToast.title = `Fetching from Fathom API... (${fetched} downloaded)`;
              }
            },
            5, // Fetch first 5 pages (~50 meetings)
          );

          // Store cursor for incremental loading
          this.nextCursor = result.nextCursor;
          this.hasMoreMeetings = !!result.nextCursor;

          if (progressToast) {
            progressToast.title = `Saving ${result.meetings.length} meetings to local cache...`;
          }

          // Cache the results
          await this.cacheApiResults(result.meetings);
          this.lastCacheUpdateTime = Date.now();

          if (progressToast) {
            progressToast.style = Toast.Style.Success;
            progressToast.title = `${result.meetings.length} meetings ready — cached locally`;
            if (this.hasMoreMeetings) {
              progressToast.message = "Scroll to the bottom to load older meetings";
            }
          }

          return result.meetings;
        } catch (error) {
          // Hide or update toast on error
          if (progressToast) {
            progressToast.hide();
          }
          throw error;
        }
      },
      1, // Priority: 1 (normal)
    );

    return result;
  }

  /**
   * Cache API results (deduplicated by data hash)
   */
  private async cacheApiResults(meetings: Meeting[]): Promise<void> {
    // Create a hash of meeting IDs to detect if the set of meetings has changed
    // Only use recordingId (immutable) to avoid invalidation from timestamp updates
    const dataHash = meetings
      .map((m) => m.recordingId)
      .sort()
      .join(",");

    if (this.lastApiDataHash === dataHash) {
      logger.log("[CacheManager] Skipping cache - same data already processed");
      return;
    }

    if (this.isCaching) {
      logger.log("[CacheManager] Skipping cache - already caching");
      return;
    }

    this.isCaching = true;
    this.lastApiDataHash = dataHash;

    try {
      const totalMeetings = meetings.length;
      logger.log(`[CacheManager] Caching ${totalMeetings} meetings`);

      // Cache each meeting sequentially
      for (const meeting of meetings) {
        await cacheMeeting(
          meeting.recordingId,
          meeting,
          meeting.summaryText,
          meeting.transcriptText,
          meeting.actionItems,
        );
      }

      // Prune old entries to maintain cache size
      await pruneCache(CACHE_SIZE);

      // Reload cached meetings
      const cached = await getAllCachedMeetings();
      this.cachedMeetings = cached;
      logger.log(`[CacheManager] Cache updated, now have ${cached.length} meetings`);

      // Notify all subscribers
      this.notifyListeners();
    } catch (error) {
      logger.error("[CacheManager] Error caching meetings:", error);
      throw error;
    } finally {
      this.isCaching = false;
    }
  }

  /**
   * Load more meetings from the next page (incremental pagination)
   */
  async loadMoreMeetings(filter: MeetingFilter = {}): Promise<void> {
    if (this.isLoadingMore) {
      logger.log("[CacheManager] loadMoreMeetings already in progress");
      return;
    }

    if (!this.hasMoreMeetings || !this.nextCursor) {
      logger.log("[CacheManager] No more meetings to load");
      await showToast({
        style: Toast.Style.Success,
        title: "All meetings loaded",
      });
      return;
    }

    const cursor = this.nextCursor;
    const requestKey = `load-more-meetings:${cursor}:${JSON.stringify(filter)}`;

    await globalQueue.enqueue(
      requestKey,
      async () => {
        this.isLoadingMore = true;
        try {
          const progressToast = await showToast({
            style: Toast.Style.Animated,
            title: "Fetching older meetings from Fathom...",
          });

          logger.log(`[CacheManager] Loading more meetings from cursor: ${cursor}`);

          const result = await listAllMeetings(
            { ...filter, cursor },
            (fetched) => {
              progressToast.title = `Fetching older meetings from Fathom... (${fetched} downloaded)`;
            },
            5, // Fetch next 5 pages (~50 more meetings)
          );

          // Update cursor for next load
          this.nextCursor = result.nextCursor;
          this.hasMoreMeetings = !!result.nextCursor;

          progressToast.title = `Saving ${result.meetings.length} meetings to local cache...`;

          // Cache the new results (will merge with existing)
          await this.cacheApiResults(result.meetings);
          this.lastCacheUpdateTime = Date.now();

          progressToast.style = Toast.Style.Success;
          progressToast.title = `${result.meetings.length} older meetings cached locally`;
          progressToast.message = this.hasMoreMeetings ? "Scroll to the bottom to load more" : "All meetings loaded";
        } catch (error) {
          await showContextualError(error, {
            action: "load more meetings",
            fallbackTitle: "Failed to Load More Meetings",
          });
          throw error;
        } finally {
          this.isLoadingMore = false;
        }
      },
      1,
    );
  }

  /**
   * Check if more meetings are available to load
   */
  hasMore(): boolean {
    return this.hasMoreMeetings;
  }

  /**
   * Refresh cache by fetching from API
   */
  async refreshCache(filter: MeetingFilter = {}): Promise<void> {
    let progressToast: Toast | undefined;

    try {
      progressToast = await showToast({
        style: Toast.Style.Animated,
        title: "Refreshing meetings...",
      });

      // Clear the last data hash and cursor to force fresh fetch
      this.lastApiDataHash = null;
      this.nextCursor = undefined;
      this.hasMoreMeetings = true;

      await this.fetchAndCache(filter, { force: true });

      if (progressToast) {
        progressToast.style = Toast.Style.Success;
        progressToast.title = "Meetings refreshed";
      }
    } catch (error) {
      // Hide the animated toast on error (error toast will be shown separately)
      if (progressToast) {
        progressToast.hide();
      }
      await showContextualError(error, {
        action: "refresh meetings",
        fallbackTitle: "Failed to Refresh Meetings",
      });
      throw error;
    }
  }

  /**
   * Get current cached meetings
   */
  getCachedMeetings(): CachedMeetingData[] {
    return this.cachedMeetings;
  }

  /**
   * Check if cache is loaded
   */
  isCacheLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Get cache stats for debugging
   */
  getStats(): {
    loaded: boolean;
    caching: boolean;
    count: number;
    listeners: number;
  } {
    return {
      loaded: this.isLoaded,
      caching: this.isCaching,
      count: this.cachedMeetings.length,
      listeners: this.listeners.size,
    };
  }
}

// Global singleton instance
const cacheManager = new CacheManager();

export { cacheManager };
export type { CacheListener };
