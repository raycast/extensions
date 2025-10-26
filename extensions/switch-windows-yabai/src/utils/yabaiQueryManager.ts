/**
 * Yabai Query Manager to consolidate and cache yabai command executions
 * Prevents redundant processes and provides a centralized data source
 */

import { exec } from "child_process";
import { promisify } from "util";
import { YabaiWindow, YabaiSpace, YabaiDisplay, ENV, YABAI } from "../models";
import { performanceMonitor } from "./performanceMonitor";
import { IncompleteJsonError, safeJsonParse } from "./json";

const execAsync = promisify(exec);

interface QueryCache<T> {
  data: T | null;
  timestamp: number;
  inFlight: Promise<T> | null;
}

class YabaiQueryManager {
  private cache = {
    windows: { data: null, timestamp: 0, inFlight: null } as QueryCache<YabaiWindow[]>,
    spaces: { data: null, timestamp: 0, inFlight: null } as QueryCache<YabaiSpace[]>,
    displays: { data: null, timestamp: 0, inFlight: null } as QueryCache<YabaiDisplay[]>,
  };

  private readonly CACHE_TTL_MS = 2000; // 2 seconds

  async queryWindows(): Promise<YabaiWindow[]> {
    return this.performQuery("windows", "-m query --windows");
  }

  async querySpaces(): Promise<YabaiSpace[]> {
    return this.performQuery("spaces", "-m query --spaces");
  }

  async queryDisplays(): Promise<YabaiDisplay[]> {
    return this.performQuery("displays", "-m query --displays");
  }

  private async performQuery<T>(type: keyof typeof this.cache, command: string): Promise<T> {
    const cacheEntry = this.cache[type];

    if (cacheEntry.inFlight) {
      return cacheEntry.inFlight as Promise<T>;
    }

    const now = Date.now();
    if (cacheEntry.data && now - cacheEntry.timestamp < this.CACHE_TTL_MS) {
      performanceMonitor.recordMetric(`${type}-query-cache-hit`, 0);
      return cacheEntry.data as T;
    }

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    const promise = performanceMonitor.measureAsync(`${type}-query`, async () => {
      let attempts = 0;
      const maxAttempts = 2; // initial + one retry for incomplete output
      while (attempts < maxAttempts) {
        attempts++;
        try {
          const { stdout } = await execAsync(`${YABAI} ${command}`, { env: ENV, maxBuffer: 10 * 1024 * 1024 });
          const stdoutStr = typeof stdout === "string" ? stdout : JSON.stringify(stdout);
          const parsed = safeJsonParse<T>(stdoutStr);
          cacheEntry.data = parsed as unknown as T;
          cacheEntry.timestamp = Date.now();
          return parsed;
        } catch (error) {
          if (error instanceof IncompleteJsonError && attempts < maxAttempts) {
            // Short backoff and retry once
            await sleep(60);
            continue;
          }
          console.error(`Error querying ${type}:`, error);
          // Return stale data on error if available
          if (cacheEntry.data) {
            return cacheEntry.data as T;
          }
          throw error;
        } finally {
          // inFlight reset handled after loop
        }
      }
      // Should not reach here; fallback to cached or throw
      if (cacheEntry.data) return cacheEntry.data as T;
      throw new Error(`Failed to query ${type}`);
    });

    cacheEntry.inFlight = promise as Promise<unknown>;
    const result = await promise;
    cacheEntry.inFlight = null;
    return result;
  }

  invalidateCache(type?: keyof typeof this.cache): void {
    if (type) {
      this.cache[type].timestamp = 0;
    } else {
      Object.values(this.cache).forEach((entry) => (entry.timestamp = 0));
    }
  }
}

export const yabaiQueryManager = new YabaiQueryManager();
