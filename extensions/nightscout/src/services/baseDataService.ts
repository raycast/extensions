import { Cache } from "@raycast/api";
import { AppError } from "../types";
import { createNetworkError, createDataValidationError } from "../utils/errorHandling";

interface CachedData<T> {
  data: T[];
  lastFetched: number;
  lastTimestamp: number;
}

interface DataServiceConfig {
  instance: string;
  token?: string;
}

interface ApiUrlBuilder {
  buildUrl(config: DataServiceConfig, lastTimestamp?: number): string;
}

interface DataValidator<T> {
  isValid(item: unknown): item is T;
  validateArray(data: unknown): data is T[];
}

interface TimestampExtractor<T> {
  getTimestamp(item: T): number;
}

/**
 * Generic base service for fetching and caching data from Nightscout API
 */
export abstract class BaseDataService<T> {
  protected cache = new Cache();
  protected readonly CACHE_DURATION = 60 * 1000; // 1 minute

  constructor(
    protected cacheKey: string,
    protected urlBuilder: ApiUrlBuilder,
    protected validator: DataValidator<T>,
    protected timestampExtractor: TimestampExtractor<T>,
  ) {}

  private validateUrlProtocol(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  private getCachedData(): CachedData<T> | null {
    try {
      const cachedString = this.cache.get(this.cacheKey);
      if (!cachedString) return null;

      const parsed = JSON.parse(cachedString) as CachedData<T>;
      return parsed;
    } catch (error) {
      console.error(`Failed to parse cached ${this.cacheKey} data:`, error);
      return null;
    }
  }

  private setCachedData(data: CachedData<T>): void {
    try {
      this.cache.set(this.cacheKey, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to cache ${this.cacheKey} data:`, error);
    }
  }

  private async fetchFromApi(config: DataServiceConfig, lastTimestamp?: number): Promise<T[]> {
    if (!this.validateUrlProtocol(config.instance)) {
      throw createNetworkError(new Error("Invalid URL protocol"), config.instance, Boolean(config.token));
    }

    const apiUrl = this.urlBuilder.buildUrl(config, lastTimestamp);

    try {
      const response = await fetch(apiUrl);

      if (!response.ok) {
        let error: Error;
        if (response.status === 401) {
          error = new Error("Unauthorized");
        } else if (response.status === 404) {
          error = new Error("Not Found");
        } else if (response.status === 429) {
          error = new Error("Too Many Requests");
        } else {
          error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        throw createNetworkError(error, config.instance, Boolean(config.token));
      }

      const data = await response.json();

      if (!this.validator.validateArray(data)) {
        throw createDataValidationError(config.instance);
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes("NetworkError")) {
        throw createNetworkError(error, config.instance, Boolean(config.token));
      }
      throw error;
    }
  }

  /**
   * Get data, using cache if fresh or fetching from API if stale
   */
  async getData(
    config: DataServiceConfig,
    forceRefresh = false,
  ): Promise<{
    data: T[];
    fromCache: boolean;
    error?: AppError;
  }> {
    const now = Date.now();
    const cachedData = this.getCachedData();

    // check if we can use cached data
    if (!forceRefresh && cachedData && now - cachedData.lastFetched < this.CACHE_DURATION) {
      return {
        data: cachedData.data,
        fromCache: true,
      };
    }

    try {
      // determine if this is an incremental or full fetch
      const isIncremental = cachedData && cachedData.data && cachedData.data.length > 0;
      const lastTimestamp = isIncremental ? cachedData.lastTimestamp : undefined;

      const newData = await this.fetchFromApi(config, lastTimestamp);

      let allData: T[];

      if (isIncremental && cachedData) {
        // merge new data with existing ones
        const combined = [...cachedData.data, ...newData];
        // remove duplicates and sort by timestamp (newest first)
        const unique = combined.filter(
          (item, index, self) =>
            index ===
            self.findIndex(
              (i) => this.timestampExtractor.getTimestamp(i) === this.timestampExtractor.getTimestamp(item),
            ),
        );
        allData = unique.sort(
          (a, b) => this.timestampExtractor.getTimestamp(b) - this.timestampExtractor.getTimestamp(a),
        );
      } else {
        // full refresh or first fetch
        allData = [...newData].sort(
          (a, b) => this.timestampExtractor.getTimestamp(b) - this.timestampExtractor.getTimestamp(a),
        );
      }

      // update cache
      const newCachedData: CachedData<T> = {
        data: allData,
        lastFetched: now,
        lastTimestamp:
          allData.length > 0 ? Math.max(...allData.map((item) => this.timestampExtractor.getTimestamp(item))) : now,
      };

      this.setCachedData(newCachedData);

      return {
        data: allData,
        fromCache: false,
      };
    } catch (error) {
      console.error(`Failed to fetch ${this.cacheKey}:`, error);

      // return cached data if available, even if stale
      if (cachedData) {
        return {
          data: cachedData.data,
          fromCache: true,
          error: error as AppError,
        };
      }

      return {
        data: [],
        fromCache: false,
        error: error as AppError,
      };
    }
  }

  /**
   * Force refresh data and update cache
   */
  async refreshData(config: DataServiceConfig): Promise<{
    data: T[];
    error?: AppError;
  }> {
    const result = await this.getData(config, true);
    return {
      data: result.data,
      error: result.error,
    };
  }

  /**
   * Get cached data without making any API calls
   */
  getCached(): T[] {
    const cachedData = this.getCachedData();
    return cachedData?.data || [];
  }

  /**
   * Check if cache is stale
   */
  isCacheStale(): boolean {
    const cachedData = this.getCachedData();
    if (!cachedData) return true;

    const now = Date.now();
    return now - cachedData.lastFetched >= this.CACHE_DURATION;
  }
}
