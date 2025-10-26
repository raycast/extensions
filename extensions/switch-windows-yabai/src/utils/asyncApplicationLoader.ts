/**
 * Async application loader to replace synchronous filesystem operations
 * Provides non-blocking application discovery with caching and error handling
 */

import * as path from "node:path";
import * as fs from "node:fs/promises";
import { Application, ENV } from "../models";
import { performanceMonitor } from "./performanceMonitor";
import { storageManager } from "./batchedStorage";

interface ApplicationCache {
  applications: Application[];
  timestamp: number;
  version: string;
}

const CACHE_VERSION = "1.0";
const CACHE_KEY = "async-applications-cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class AsyncApplicationLoader {
  private applications: Application[] = [];
  private isLoading = false;
  private lastLoadTime = 0;
  private loadPromise: Promise<Application[]> | null = null;

  private readonly appDirectories = [
    "/Applications",
    path.join(ENV.HOME, "Applications"),
    "/System/Applications",
    "/System/Library/CoreServices",
  ];

  /**
   * Load applications asynchronously with caching
   */
  async loadApplications(forceRefresh = false): Promise<Application[]> {
    // Return cached data if available and not expired
    if (!forceRefresh && this.applications.length > 0 && !this.isDataStale()) {
      performanceMonitor.recordMetric("app-loading-cache-hit", 0);
      return this.applications;
    }

    // If already loading, return the existing promise
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Try loading from persistent cache first
    if (!forceRefresh) {
      const cachedApps = await this.loadFromCache();
      if (cachedApps.length > 0) {
        this.applications = cachedApps;
        performanceMonitor.recordMetric("app-loading-persistent-cache-hit", 0);
        return cachedApps;
      }
    }

    // Start fresh load
    this.loadPromise = this.performLoad();

    try {
      const apps = await this.loadPromise;
      this.applications = apps;
      this.lastLoadTime = Date.now();

      // Save to cache asynchronously (don't await)
      this.saveToCache(apps);

      return apps;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * Get currently loaded applications (synchronous)
   */
  getApplications(): Application[] {
    return this.applications;
  }

  /**
   * Check if data is stale
   */
  private isDataStale(): boolean {
    return Date.now() - this.lastLoadTime > CACHE_TTL_MS;
  }

  /**
   * Perform the actual application loading
   */
  private async performLoad(): Promise<Application[]> {
    return performanceMonitor.measureAsync("app-loading", async () => {
      this.isLoading = true;
      const applications: Application[] = [];

      try {
        // Process directories concurrently
        const directoryPromises = this.appDirectories.map((dir) => this.processDirectory(dir));

        const directoryResults = await Promise.allSettled(directoryPromises);

        // Combine results from all directories
        directoryResults.forEach((result) => {
          if (result.status === "fulfilled") {
            applications.push(...result.value);
          }
        });

        console.log(`📱 Loaded ${applications.length} applications asynchronously`);

        return applications;
      } finally {
        this.isLoading = false;
      }
    });
  }

  /**
   * Process a single directory for applications
   */
  private async processDirectory(directory: string): Promise<Application[]> {
    try {
      // Check if directory exists
      await fs.access(directory);

      // Read directory contents
      const files = await fs.readdir(directory);

      // Filter and process .app files
      const appPromises = files
        .filter((file) => file.endsWith(".app"))
        .map(async (file): Promise<Application | null> => {
          try {
            const appPath = path.join(directory, file);
            const appName = file.replace(".app", "");

            // Verify it's actually a directory (apps are bundles)
            const stats = await fs.stat(appPath);
            if (stats.isDirectory()) {
              return { name: appName, path: appPath };
            }
            return null;
          } catch (error) {
            // Skip files that can't be processed
            console.warn(`Skipping ${file}:`, error);
            return null;
          }
        });

      const apps = await Promise.all(appPromises);
      return apps.filter((app): app is Application => app !== null);
    } catch (error) {
      console.warn(`Cannot access directory ${directory}:`, error);
      return [];
    }
  }

  /**
   * Load applications from persistent cache
   */
  private async loadFromCache(): Promise<Application[]> {
    try {
      const cached = await storageManager.get<string>(CACHE_KEY);
      if (!cached) return [];

      const cacheData: ApplicationCache = JSON.parse(cached);

      // Check cache version and age
      if (cacheData.version !== CACHE_VERSION) {
        console.log("Cache version mismatch, ignoring cache");
        return [];
      }

      const age = Date.now() - cacheData.timestamp;
      if (age > CACHE_TTL_MS) {
        console.log("Cache expired, ignoring cache");
        return [];
      }

      console.log(`📱 Loaded ${cacheData.applications.length} applications from cache`);
      return cacheData.applications;
    } catch (error) {
      console.error("Error loading applications from cache:", error);
      return [];
    }
  }

  /**
   * Save applications to persistent cache
   */
  private async saveToCache(applications: Application[]): Promise<void> {
    try {
      const cacheData: ApplicationCache = {
        applications,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      };

      storageManager.set(CACHE_KEY, cacheData);
      console.log(`💾 Saved ${applications.length} applications to cache`);
    } catch (error) {
      console.error("Error saving applications to cache:", error);
    }
  }

  /**
   * Refresh applications in the background
   */
  async refreshInBackground(): Promise<void> {
    // Don't block - run in background
    this.loadApplications(true).catch((error) => {
      console.error("Background application refresh failed:", error);
    });
  }

  /**
   * Clear cache and force reload
   */
  async clearCacheAndReload(): Promise<Application[]> {
    await storageManager.remove(CACHE_KEY);
    this.applications = [];
    this.lastLoadTime = 0;
    return this.loadApplications(true);
  }

  /**
   * Get loader status
   */
  getStatus(): {
    isLoading: boolean;
    lastLoadTime: number;
    applicationCount: number;
    isStale: boolean;
  } {
    return {
      isLoading: this.isLoading,
      lastLoadTime: this.lastLoadTime,
      applicationCount: this.applications.length,
      isStale: this.isDataStale(),
    };
  }
}

// Export singleton instance
export const asyncApplicationLoader = new AsyncApplicationLoader();
