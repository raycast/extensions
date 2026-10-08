import { LocalStorage } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { AppInfo } from "../types";

const execFileAsync = promisify(execFile) as (
  file: string,
  args: string[],
  options: { timeout: number; encoding: BufferEncoding; maxBuffer: number },
) => Promise<{ stdout: string; stderr: string }>;

// Cache for discovered apps to avoid repeated expensive mdfind calls
let appsCache: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function discoverApps(): Promise<string[]> {
  const startTime = Date.now();
  const now = Date.now();

  // Return cached result if still valid
  if (appsCache && now - cacheTimestamp < CACHE_DURATION) {
    console.log(`[PERF] Using cached apps (${appsCache.length} apps) - ${Date.now() - startTime}ms`);
    return appsCache;
  }

  console.log(`[PERF] Starting app discovery...`);
  try {
    const mdfindStart = Date.now();
    const { stdout } = await execFileAsync("mdfind", [`kMDItemContentType == "com.apple.application-bundle"`], {
      timeout: 10000, // 10 second timeout
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    const mdfindTime = Date.now() - mdfindStart;
    console.log(`[PERF] mdfind completed in ${mdfindTime}ms`);

    const allPaths = stdout.split("\n").filter(Boolean);
    console.log(`[PERF] Found ${allPaths.length} total app paths`);

    const filterStart = Date.now();
    appsCache = allPaths.filter((path) => {
      const isMainApp = path.match(/\/Applications\/[^/]+\.app$/) || path.match(/\/System\/Applications\/[^/]+\.app$/);
      const isSystemService =
        path.includes("/Contents/") ||
        path.includes("/Helpers/") ||
        path.includes("/Support/") ||
        path.includes("/Library/");
      return isMainApp && !isSystemService;
    });
    const filterTime = Date.now() - filterStart;
    console.log(`[PERF] Filtered to ${appsCache.length} main apps in ${filterTime}ms`);

    cacheTimestamp = now;
    const totalTime = Date.now() - startTime;
    console.log(`[PERF] App discovery completed in ${totalTime}ms`);
    return appsCache;
  } catch (error) {
    console.warn("Failed to discover apps, using cache if available:", error);
    return appsCache || [];
  }
}

export function createInitialApps(paths: string[], tagMap: { [key: string]: string[] }): AppInfo[] {
  return paths.map((path) => {
    const name = path.split("/").pop()?.replace(".app", "") || "Unknown";
    return {
      name,
      displayName: name,
      path,
      tags: tagMap[name] || [],
    };
  });
}

// Cache for display names to avoid repeated mdls calls
type DisplayNameEntry = { displayName: string; timestamp: number };
const displayNamesCache: { [path: string]: DisplayNameEntry } = {};
let displayNamesCacheLoaded = false;
const DISPLAY_NAMES_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const DISPLAY_NAMES_CACHE_KEY = "display-names-cache";
const MAX_CONCURRENT_DISPLAY_BATCHES = 4;
// Force cache invalidation for debugging
let forceInvalidateDisplayNames = false;

async function ensureDisplayNamesCacheLoaded(): Promise<void> {
  if (displayNamesCacheLoaded) {
    return;
  }

  const loadStart = Date.now();
  const raw = await LocalStorage.getItem<string>(DISPLAY_NAMES_CACHE_KEY);
  const loadTime = Date.now() - loadStart;

  if (!raw) {
    console.log(`[PERF] No persisted display name cache found - ${loadTime}ms`);
    displayNamesCacheLoaded = true;
    return;
  }

  try {
    const parsed = JSON.parse(raw) as { [path: string]: DisplayNameEntry };
    const now = Date.now();
    let validCount = 0;
    let staleCount = 0;

    Object.entries(parsed).forEach(([path, entry]) => {
      if (entry && typeof entry.displayName === "string" && typeof entry.timestamp === "number") {
        if (now - entry.timestamp <= DISPLAY_NAMES_CACHE_DURATION) {
          displayNamesCache[path] = entry;
          validCount++;
        } else {
          staleCount++;
        }
      }
    });

    console.log(
      `[PERF] Loaded ${validCount} persisted display names in ${loadTime}ms${staleCount ? ` (${staleCount} stale skipped)` : ""}`,
    );
  } catch (error) {
    console.warn("[PERF] Failed to parse persisted display name cache:", error);
  }

  displayNamesCacheLoaded = true;
}

async function persistDisplayNamesCache(): Promise<void> {
  const persistStart = Date.now();
  await LocalStorage.setItem(DISPLAY_NAMES_CACHE_KEY, JSON.stringify(displayNamesCache));
  const persistTime = Date.now() - persistStart;
  console.log(
    `[PERF] Persisted display name cache (${Object.keys(displayNamesCache).length} entries) in ${persistTime}ms`,
  );
}

export async function getCachedDisplayNames(paths: string[]): Promise<{ [path: string]: string }> {
  await ensureDisplayNamesCacheLoaded();
  const now = Date.now();
  const cached: { [path: string]: string } = {};

  paths.forEach((path) => {
    const entry = displayNamesCache[path];
    if (entry && entry.displayName && now - entry.timestamp <= DISPLAY_NAMES_CACHE_DURATION) {
      cached[path] = entry.displayName;
    }
  });

  return cached;
}

export async function loadDisplayNames(paths: string[]): Promise<{ [path: string]: string }> {
  const startTime = Date.now();
  const updates: { [path: string]: string } = {};

  console.log(`[PERF] Starting display names load for ${paths.length} paths...`);
  await ensureDisplayNamesCacheLoaded();
  const now = Date.now();

  // Filter out paths we already have cached
  const pathsToLoad = paths.filter((path) => {
    const entry = displayNamesCache[path];
    return (
      !entry ||
      forceInvalidateDisplayNames ||
      !entry.displayName ||
      now - entry.timestamp > DISPLAY_NAMES_CACHE_DURATION
    );
  });

  // Return cached results for paths we don't need to reload
  paths.forEach((path) => {
    const entry = displayNamesCache[path];
    if (
      entry &&
      entry.displayName &&
      !forceInvalidateDisplayNames &&
      now - entry.timestamp <= DISPLAY_NAMES_CACHE_DURATION
    ) {
      updates[path] = entry.displayName;
    }
  });

  console.log(`[PERF] ${paths.length - pathsToLoad.length} paths from cache, ${pathsToLoad.length} paths to load`);

  if (pathsToLoad.length === 0) {
    console.log(`[PERF] All display names from cache - ${Date.now() - startTime}ms`);
    return updates;
  }

  const batchSize = 20; // Smaller batch size for better responsiveness
  const totalBatches = Math.ceil(pathsToLoad.length / batchSize);
  console.log(
    `[PERF] Processing ${pathsToLoad.length} paths in ${totalBatches} batches of ${batchSize} (max ${MAX_CONCURRENT_DISPLAY_BATCHES} concurrent batches)`,
  );

  let totalSuccessful = 0;
  let shouldPersist = false;
  const runningBatches: Promise<void>[] = [];

  const scheduleBatch = async (batch: string[], batchNum: number) => {
    const batchPromise = (async () => {
      const batchStart = Date.now();
      console.log(`[PERF] Processing batch ${batchNum}/${totalBatches} (${batch.length} paths)...`);

      let successCount = 0;
      const results = await Promise.allSettled(
        batch.map(async (path) => {
          try {
            const { stdout } = await execFileAsync("mdls", ["-name", "kMDItemDisplayName", "-raw", path], {
              timeout: 2000,
              encoding: "utf8",
              maxBuffer: 1024 * 32,
            });

            const result = stdout.trim();
            if (result && result !== "(null)") {
              const displayName = result.replace(".app", "");
              const timestamp = Date.now();
              displayNamesCache[path] = { displayName, timestamp };
              updates[path] = displayName;
              successCount++;
              return true;
            }
          } catch (error) {
            console.warn(`Failed to get display name for ${path}:`, error);
          }
          return false;
        }),
      );

      const batchTime = Date.now() - batchStart;
      console.log(`[PERF] Batch ${batchNum} completed: ${successCount}/${batch.length} successful in ${batchTime}ms`);

      if (results.some((result) => result.status === "fulfilled" && !result.value)) {
        console.log(`[PERF] Batch ${batchNum} had ${batch.length - successCount} paths without display names`);
      }

      totalSuccessful += successCount;
      shouldPersist = shouldPersist || successCount > 0;
    })();

    runningBatches.push(batchPromise);
    batchPromise.finally(() => {
      const index = runningBatches.indexOf(batchPromise);
      if (index >= 0) {
        runningBatches.splice(index, 1);
      }
    });

    if (runningBatches.length >= MAX_CONCURRENT_DISPLAY_BATCHES) {
      await Promise.race(runningBatches);
    }
  };

  for (let i = 0; i < pathsToLoad.length; i += batchSize) {
    const batch = pathsToLoad.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    await scheduleBatch(batch, batchNum);
  }

  if (runningBatches.length > 0) {
    await Promise.all(runningBatches);
  }

  console.log(`[PERF] All batches completed: ${totalSuccessful}/${pathsToLoad.length} successful`);

  if (shouldPersist) {
    await persistDisplayNamesCache();
  }

  forceInvalidateDisplayNames = false;
  const totalTime = Date.now() - startTime;
  console.log(`[PERF] Display names load completed: ${Object.keys(updates).length} total in ${totalTime}ms`);

  return updates;
}

// Function to invalidate display names cache (useful for debugging)
export function invalidateDisplayNamesCache(): void {
  console.log(`[PERF] Invalidating display names cache`);
  Object.keys(displayNamesCache).forEach((key) => delete displayNamesCache[key]);
  displayNamesCacheLoaded = false;
  void LocalStorage.removeItem(DISPLAY_NAMES_CACHE_KEY);
  forceInvalidateDisplayNames = true;
}
