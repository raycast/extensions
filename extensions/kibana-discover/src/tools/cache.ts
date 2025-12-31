import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import type { AllInstancesCache } from "../types";

export const CACHE_PATH = join(
  homedir(),
  "Library/Application Support/com.raycast.macos/Extensions/kibana-discover/cache.json",
);

/**
 * Load all instances caches from the cache file
 * Supports both old single-instance format and new multi-instance format
 */
export function loadAllInstancesCaches(
  cachePath: string = CACHE_PATH,
): AllInstancesCache {
  try {
    if (!existsSync(cachePath)) {
      return {};
    }
    const content = readFileSync(cachePath, "utf8");
    const parsed = JSON.parse(content);

    // Support both old single-instance format and new multi-instance format
    if (parsed.instance && parsed.dataViews) {
      // Old format - convert to new format
      return {
        [parsed.instance.name]: parsed,
      };
    }

    // New format - already multi-instance
    return parsed as AllInstancesCache;
  } catch (error) {
    console.error("Error loading cache:", error);
    return {};
  }
}

/**
 * Save all instances caches to the cache file
 */
export function saveAllInstancesCaches(
  caches: AllInstancesCache,
  cachePath: string = CACHE_PATH,
): void {
  try {
    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, JSON.stringify(caches, null, 2));
  } catch (error) {
    console.error("Error saving cache:", error);
    throw error;
  }
}
