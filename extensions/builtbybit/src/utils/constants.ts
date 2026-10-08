import { Cache, getPreferenceValues } from "@raycast/api";
import axios from "axios";

export const API_BASE_URL = "https://api.builtbybit.com/v1";
export const API_KEY = getPreferenceValues<{ apiKey: string }>().apiKey;

export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 24 * 60 * 60 * 1000, // 24 hours
};

export const CACHE_NAMESPACE = {
  USERS: "bbb-user-cache",
  ALERTS: "bbb-alerts-cache",
};

// Interface for cached items with timestamp
interface CachedItem<T> {
  data: T;
  timestamp: number;
}

export class CacheWithTTL {
  private namespace: string;
  private cache: Cache;

  constructor(options: { namespace: string; capacity?: number }) {
    this.namespace = options.namespace;
    this.cache = new Cache({
      namespace: options.namespace,
      capacity: options?.capacity ?? Cache.DEFAULT_CAPACITY,
    });
  }

  set<T>(key: string, data: T): void {
    const item: CachedItem<T> = {
      data,
      timestamp: Date.now(),
    };
    this.cache.set(this.getKey(key), JSON.stringify(item));
  }

  async get<T>(key: string, ttl: number): Promise<T | undefined> {
    const cached = this.cache.get(this.getKey(key));

    if (!cached) {
      return undefined;
    }

    try {
      const item = JSON.parse(cached) as CachedItem<T>;
      const now = Date.now();

      if (now - item.timestamp > ttl) {
        await this.remove(key);
        return undefined;
      }
      return item.data;
    } catch (error) {
      console.error("Problem with cache. ", error);
      await this.remove(key);
      return undefined;
    }
  }

  async remove(key: string): Promise<void> {
    this.cache.remove(this.getKey(key));
  }

  async clear(options?: { notifySubscribers: boolean }): Promise<void> {
    this.cache.clear(options);
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(this.getKey(key));
  }

  get isEmpty(): boolean {
    return this.cache.isEmpty;
  }

  private getKey(key: string): string {
    return `${this.namespace}-${key}`;
  }
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Private ${API_KEY}`,
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;

      if (status === 401) {
        return Promise.reject(new Error("Invalid API key. Please check your API key in the preferences."));
      } else if (status === 404) {
        return Promise.reject(new Error(`Resource not found: ${message}`));
      } else if (status === 429) {
        return Promise.reject(new Error("Rate limit exceeded. Please try again later."));
      }
      return Promise.reject(new Error(`API Error (${status}): ${message}`));
    }
    return Promise.reject(error);
  },
);

export default apiClient;
