/**
 * Singleton cache manager to coordinate caching across all views
 *
 * Features:
 * - Prevents duplicate cache operations
 * - Shares cached data across all components
 * - Provides event-based updates when cache changes
 * - Handles cache invalidation and refresh
 * - Supports aborting background fetches
 */

import { showToast, Toast } from "@raycast/api";
import { listMeetings } from "../fathom/api";
import type { MeetingFilter, Meeting } from "../types/Types";
import {
  cacheMeetingsBatch,
  getAllCachedMeetings,
  pruneCache,
  updateCacheMetadataFromMeetings,
  getCacheMetadata,
  type CachedMeetingData,
} from "./cache";
import { globalQueue } from "./requestQueue";
import { showContextualError } from "./errorHandling";
import { logger } from "@chrismessina/raycast-logger";

const CACHE_SIZE = 500; // Keep all meetings (auto-paginated from API)

type CacheListener = (meetings: CachedMeetingData[]) => void;
type FetchingListener = (isFetching: boolean) => void;

class CacheManager {
  private cachedMeetings: CachedMeetingData[] = [];
  private isLoaded = false;
  private isLoading = false;
  private isCaching = false;
  private listeners = new Set<CacheListener>();
  private fetchingListeners = new Set<FetchingListener>();
  private lastApiDataHash: string | null = null;
  private lastFetchTime = 0;
  private lastCacheUpdateTime = 0;
  private CACHE_STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  private FETCH_COOLDOWN = 5000; // 5 seconds minimum between fetches
  private nextCursor: string | undefined = undefined;
  private hasMoreMeetings = true;
  private isLoadingMore = false;

  // Separate abort tokens for each fetch path so they don't cancel each other
  private remainingPagesToken = 0;
  private loadMoreToken = 0;
  private _isFetchingBackground = false;

  // ─── Subscriptions ────────────────────────────────────────────────────────

  subscribe(listener: CacheListener): () => void {
    this.listeners.add(listener);
    logger.log(`[CacheManager] Subscriber added (total: ${this.listeners.size})`);
    if (this.isLoaded) {
      listener(this.cachedMeetings);
    }
    return () => {
      this.listeners.delete(listener);
      logger.log(`[CacheManager] Subscriber removed (total: ${this.listeners.size})`);
    };
  }

  /**
   * Subscribe to background-fetch state changes (true = fetching, false = idle).
   * Lets the UI show/hide a Stop action.
   */
  subscribeFetching(listener: FetchingListener): () => void {
    this.fetchingListeners.add(listener);
    // Immediately notify with current state
    listener(this._isFetchingBackground);
    return () => {
      this.fetchingListeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    logger.log(`[CacheManager] Notifying ${this.listeners.size} listeners`);
    this.listeners.forEach((listener) => listener(this.cachedMeetings));
  }

  private setFetchingBackground(value: boolean): void {
    if (this._isFetchingBackground === value) return;
    this._isFetchingBackground = value;
    this.fetchingListeners.forEach((l) => l(value));
  }

  isFetchingBackground(): boolean {
    return this._isFetchingBackground;
  }

  /**
   * Abort any in-progress background fetch.
   * The current page request will finish (HTTP can't be cancelled),
   * but no further pages will be fetched and the cache won't be updated.
   */
  stopBackgroundFetch(): void {
    if (!this._isFetchingBackground) return;
    this.remainingPagesToken++;
    this.loadMoreToken++;
    logger.log(`[CacheManager] Background fetch aborted (remainingPages token: ${this.remainingPagesToken}, loadMore token: ${this.loadMoreToken})`);
    this.setFetchingBackground(false);
  }

  // ─── Staleness ────────────────────────────────────────────────────────────

  isCacheStale(): boolean {
    if (!this.lastCacheUpdateTime) return true;
    return Date.now() - this.lastCacheUpdateTime > this.CACHE_STALE_THRESHOLD;
  }

  getCacheAgeMinutes(): number {
    if (!this.lastCacheUpdateTime) return 0;
    return Math.round((Date.now() - this.lastCacheUpdateTime) / 60000);
  }

  // ─── Load from storage ────────────────────────────────────────────────────

  async loadCache(): Promise<CachedMeetingData[]> {
    if (this.isLoaded) {
      logger.log(`[CacheManager] Cache already loaded (${this.cachedMeetings.length} meetings)`);
      return this.cachedMeetings;
    }

    if (this.isLoading) {
      logger.log("[CacheManager] Cache load already in progress, waiting...");
      const maxWaitTime = 30000;
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

      const metadata = await getCacheMetadata();
      if (metadata) {
        this.lastCacheUpdateTime = metadata.lastUpdated;
        logger.log(`[CacheManager] Restored cache update time: ${new Date(this.lastCacheUpdateTime).toISOString()}`);
      }

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

  // ─── Fetch & Cache ────────────────────────────────────────────────────────

  async fetchAndCache(filter: MeetingFilter = {}, options: { force?: boolean } = {}): Promise<Meeting[]> {
    const { force = false } = options;

    const now = Date.now();
    const timeSinceLastFetch = now - this.lastFetchTime;

    if (!force && timeSinceLastFetch < this.FETCH_COOLDOWN) {
      logger.log(
        `[CacheManager] Fetch cooldown active (${Math.round((this.FETCH_COOLDOWN - timeSinceLastFetch) / 1000)}s remaining), using cached data`,
      );
      return this.cachedMeetings.map((cached) => cached.meeting as Meeting);
    }

    if (force) {
      logger.log("[CacheManager] Forced fetch - clearing data hash for fresh results");
      this.lastApiDataHash = null;
    }

    const filterKey = JSON.stringify(filter);
    const requestKey = `fetch-meetings:${filterKey}`;

    logger.log(`[CacheManager] Fetch request for filter: ${filterKey}`);
    this.lastFetchTime = now;

    const result = await globalQueue.enqueue(
      requestKey,
      async () => {
        logger.log(`[CacheManager] Fetching first page for: ${filterKey}`);

        const firstPage = await listMeetings(filter);
        const firstPageMeetings = firstPage.items;
        const firstPageCursor = firstPage.nextCursor;

        logger.log(`[CacheManager] First page: ${firstPageMeetings.length} meetings`);

        // Cache and display first page immediately
        await this.cacheApiResults(firstPageMeetings);

        // Background-fetch remaining pages without blocking the UI
        if (firstPageCursor) {
          this.nextCursor = firstPageCursor;
          this.hasMoreMeetings = true;
          this.fetchRemainingPages(filter, firstPageCursor, firstPageMeetings).catch((err) => {
            logger.error("[CacheManager] Background fetch error:", err);
          });
        } else {
          this.nextCursor = undefined;
          this.hasMoreMeetings = false;
          this.lastCacheUpdateTime = Date.now();
          await updateCacheMetadataFromMeetings(this.cachedMeetings);
        }

        return firstPageMeetings;
      },
      1,
    );

    return result;
  }

  /**
   * Background-fetch pages 2–5 and merge them into the cache progressively.
   * Respects abort tokens — stops immediately if stopBackgroundFetch() is called.
   */
  private async fetchRemainingPages(
    filter: MeetingFilter,
    startCursor: string,
    alreadyCached: Meeting[],
  ): Promise<void> {
    const token = this.remainingPagesToken;
    this.setFetchingBackground(true);

    const progressToast = await showToast({
      style: Toast.Style.Animated,
      title: `Fetching more meetings... (${alreadyCached.length} loaded)`,
      primaryAction: {
        title: "Stop Fetching Meetings",
        onAction: () => this.stopBackgroundFetch(),
      },
    });

    try {
      // Page-by-page so we can check the abort token between pages
      let cursor: string | undefined = startCursor;
      const additionalMeetings: Meeting[] = [];
      let pageNum = 0;
      const MAX_BACKGROUND_PAGES = 4;

      while (cursor && pageNum < MAX_BACKGROUND_PAGES) {
        // Check abort token before each page request
        if (this.remainingPagesToken !== token) {
          logger.log("[CacheManager] Background fetch aborted — stopping");
          progressToast.hide();
          return;
        }

        pageNum++;
        const page = await listMeetings({ ...filter, cursor });
        additionalMeetings.push(...page.items);
        cursor = page.nextCursor;

        const totalSoFar = alreadyCached.length + additionalMeetings.length;
        progressToast.title = `Fetching more meetings... (${totalSoFar} loaded)`;
        logger.log(`[CacheManager] Background page ${pageNum}: ${page.items.length} meetings (total: ${totalSoFar})`);
      }

      // Final abort check before writing
      if (this.remainingPagesToken !== token) {
        logger.log("[CacheManager] Background fetch aborted before write — discarding results");
        progressToast.hide();
        return;
      }

      this.nextCursor = cursor;
      this.hasMoreMeetings = !!cursor;

      const allMeetings = [...alreadyCached, ...additionalMeetings];
      await this.cacheApiResults(allMeetings);
      this.lastCacheUpdateTime = Date.now();
      await updateCacheMetadataFromMeetings(this.cachedMeetings);

      progressToast.style = Toast.Style.Success;
      progressToast.title = `${allMeetings.length} meetings ready`;
      progressToast.primaryAction = undefined;
      if (this.hasMoreMeetings) {
        progressToast.message = "Scroll to the bottom to load older meetings";
      }
    } catch (error) {
      progressToast.hide();
      throw error;
    } finally {
      if (this.remainingPagesToken === token) {
        this.setFetchingBackground(false);
      }
    }
  }

  // ─── Cache writes ─────────────────────────────────────────────────────────

  private async cacheApiResults(meetings: Meeting[]): Promise<void> {
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
      logger.log(`[CacheManager] Caching ${meetings.length} meetings`);

      // Batch write — all meetings in parallel, index updated once
      await cacheMeetingsBatch(
        meetings.map((m) => ({
          meetingId: m.recordingId,
          meeting: m,
          summary: m.summaryText,
          transcript: m.transcriptText,
          actionItems: m.actionItems,
        })),
      );

      await pruneCache(CACHE_SIZE);

      // Reload from storage to get the authoritative merged set
      const cached = await getAllCachedMeetings();
      this.cachedMeetings = cached;
      logger.log(`[CacheManager] Cache updated, now have ${cached.length} meetings`);

      this.notifyListeners();
    } catch (error) {
      logger.error("[CacheManager] Error caching meetings:", error);
      throw error;
    } finally {
      this.isCaching = false;
    }
  }

  // ─── Load More ────────────────────────────────────────────────────────────

  async loadMoreMeetings(filter: MeetingFilter = {}): Promise<void> {
    if (this.isLoadingMore) {
      logger.log("[CacheManager] loadMoreMeetings already in progress");
      return;
    }

    if (!this.hasMoreMeetings || !this.nextCursor) {
      logger.log("[CacheManager] No more meetings to load");
      await showToast({ style: Toast.Style.Success, title: "All meetings loaded" });
      return;
    }

    const cursor = this.nextCursor;
    const token = ++this.loadMoreToken;
    const requestKey = `load-more-meetings:${cursor}:${JSON.stringify(filter)}`;

    await globalQueue.enqueue(
      requestKey,
      async () => {
        this.isLoadingMore = true;
        this.setFetchingBackground(true);

        const progressToast = await showToast({
          style: Toast.Style.Animated,
          title: "Fetching older meetings...",
          primaryAction: {
            title: "Stop Fetching Meetings",
            onAction: () => this.stopBackgroundFetch(),
          },
        });

        try {
          logger.log(`[CacheManager] Loading more meetings from cursor: ${cursor}`);

          let pageCursor: string | undefined = cursor;
          const fetched: Meeting[] = [];
          let pageNum = 0;
          const MAX_PAGES = 5;

          while (pageCursor && pageNum < MAX_PAGES) {
            if (this.loadMoreToken !== token) {
              logger.log("[CacheManager] loadMore aborted — stopping");
              progressToast.hide();
              return;
            }

            pageNum++;
            const page = await listMeetings({ ...filter, cursor: pageCursor });
            fetched.push(...page.items);
            pageCursor = page.nextCursor;
            progressToast.title = `Fetching older meetings... (${fetched.length} downloaded)`;
            logger.log(`[CacheManager] loadMore page ${pageNum}: ${page.items.length} meetings`);
          }

          if (this.loadMoreToken !== token) {
            logger.log("[CacheManager] loadMore aborted before write — discarding");
            progressToast.hide();
            return;
          }

          this.nextCursor = pageCursor;
          this.hasMoreMeetings = !!pageCursor;

          await this.cacheApiResults(fetched);
          this.lastCacheUpdateTime = Date.now();
          await updateCacheMetadataFromMeetings(this.cachedMeetings);

          progressToast.style = Toast.Style.Success;
          progressToast.title = `${fetched.length} older meetings loaded`;
          progressToast.primaryAction = undefined;
          progressToast.message = this.hasMoreMeetings ? "Scroll to the bottom to load more" : "All meetings loaded";
        } catch (error) {
          await showContextualError(error, {
            action: "load more meetings",
            fallbackTitle: "Failed to Load More Meetings",
          });
          throw error;
        } finally {
          this.isLoadingMore = false;
          if (this.loadMoreToken === token) {
            this.setFetchingBackground(false);
          }
        }
      },
      1,
    );
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────

  async refreshCache(filter: MeetingFilter = {}): Promise<void> {
    const progressToast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing meetings...",
    });

    try {
      this.lastApiDataHash = null;
      this.nextCursor = undefined;
      this.hasMoreMeetings = true;

      await this.fetchAndCache(filter, { force: true });

      progressToast.style = Toast.Style.Success;
      progressToast.title = "Meetings refreshed";
    } catch (error) {
      progressToast.hide();
      await showContextualError(error, {
        action: "refresh meetings",
        fallbackTitle: "Failed to Refresh Meetings",
      });
      throw error;
    }
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  hasMore(): boolean {
    return this.hasMoreMeetings;
  }

  getCachedMeetings(): CachedMeetingData[] {
    return this.cachedMeetings;
  }

  isCacheLoaded(): boolean {
    return this.isLoaded;
  }

  getStats(): { loaded: boolean; caching: boolean; count: number; listeners: number } {
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
export type { CacheListener, FetchingListener };
