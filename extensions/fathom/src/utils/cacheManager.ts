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
import { listMeetings } from "../fathom/api";
import type { MeetingFilter, Meeting } from "../types/Types";
import { cacheMeeting, getAllCachedMeetings, pruneCache, type CachedMeetingData } from "./cache";
import { globalQueue } from "./requestQueue";
import { showContextualError } from "./errorHandling";
import { logger } from "@chrismessina/raycast-logger";

const CACHE_SIZE = 50; // Keep most recent 50 meetings

type CacheListener = (meetings: CachedMeetingData[]) => void;

class CacheManager {
  private cachedMeetings: CachedMeetingData[] = [];
  private isLoaded = false;
  private isLoading = false;
  private isCaching = false;
  private listeners = new Set<CacheListener>();
  private lastApiDataHash: string | null = null;
  private lastFetchTime = 0;
  private FETCH_COOLDOWN = 5000; // 5 seconds minimum between fetches

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
   * Load cached meetings from storage (called once on first use)
   */
  async loadCache(): Promise<CachedMeetingData[]> {
    if (this.isLoaded) {
      logger.log(`[CacheManager] Cache already loaded (${this.cachedMeetings.length} meetings)`);
      return this.cachedMeetings;
    }

    // Prevent concurrent loads
    if (this.isLoading) {
      logger.log("[CacheManager] Cache load already in progress, waiting...");
      // Wait for the current load to complete
      while (this.isLoading) {
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
   */
  async fetchAndCache(filter: MeetingFilter = {}): Promise<Meeting[]> {
    // Check cooldown to prevent rapid re-fetches
    const now = Date.now();
    const timeSinceLastFetch = now - this.lastFetchTime;

    if (timeSinceLastFetch < this.FETCH_COOLDOWN) {
      logger.log(
        `[CacheManager] Fetch cooldown active (${Math.round((this.FETCH_COOLDOWN - timeSinceLastFetch) / 1000)}s remaining), using cached data`,
      );
      return this.cachedMeetings.map((cached) => cached.meeting as Meeting);
    }

    // Create a unique key for this filter
    const filterKey = JSON.stringify(filter);
    const requestKey = `fetch-meetings:${filterKey}`;

    logger.log(`[CacheManager] Fetch request for filter: ${filterKey}`);

    // Update last fetch time
    this.lastFetchTime = now;

    // Use the global queue to deduplicate and throttle requests
    const result = await globalQueue.enqueue(
      requestKey,
      async () => {
        logger.log(`[CacheManager] Executing API call for: ${filterKey}`);
        const apiResult = await listMeetings(filter);

        // Cache the results
        await this.cacheApiResults(apiResult.items);

        return apiResult.items;
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

      // Only show progress toast if cache was empty and we have meetings to cache
      const shouldShowProgress = this.cachedMeetings.length === 0 && totalMeetings > 0;
      let progressToast: Toast | undefined;

      if (shouldShowProgress) {
        progressToast = await showToast({
          style: Toast.Style.Animated,
          title: `Caching 1 of ${totalMeetings} meetings`,
        });
      }

      // Cache each meeting sequentially
      for (let i = 0; i < meetings.length; i++) {
        const meeting = meetings[i];

        await cacheMeeting(
          meeting.recordingId,
          meeting,
          meeting.summaryText,
          meeting.transcriptText,
          meeting.actionItems,
        );

        // Update progress toast
        if (progressToast) {
          const current = i + 1;
          progressToast.title = `Caching ${current} of ${totalMeetings} meetings`;
        }
      }

      // Prune old entries to maintain cache size
      await pruneCache(CACHE_SIZE);

      // Reload cached meetings
      const cached = await getAllCachedMeetings();
      this.cachedMeetings = cached;
      logger.log(`[CacheManager] Cache updated, now have ${cached.length} meetings`);

      // Notify all subscribers
      this.notifyListeners();

      // Show success toast
      if (progressToast) {
        progressToast.style = Toast.Style.Success;
        progressToast.title = `Cached ${totalMeetings} meetings`;
        progressToast.message = "Full-text search now available";
      }
    } catch (error) {
      logger.error("[CacheManager] Error caching meetings:", error);
      throw error;
    } finally {
      this.isCaching = false;
    }
  }

  /**
   * Refresh cache by fetching from API
   */
  async refreshCache(filter: MeetingFilter = {}): Promise<void> {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Refreshing meetings...",
      });

      // Clear the last data hash to force re-caching
      this.lastApiDataHash = null;

      await this.fetchAndCache(filter);

      await showToast({
        style: Toast.Style.Success,
        title: "Meetings refreshed",
      });
    } catch (error) {
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
