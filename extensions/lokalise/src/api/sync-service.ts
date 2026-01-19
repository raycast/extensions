import { client } from "./client";
import { clearDatabase, writeChunk, setLastSyncTime, hasKeys, invalidateCache } from "./database";
import type { ProcessedTranslationKey } from "./client";
import { getLanguageName } from "../data/languages";

const LOKALISE_API_PAGE_SIZE = 100;
const CHUNK_SIZE = 100;
const MAX_PAGES_SAFETY_LIMIT = 500;
const DEFAULT_BACKGROUND_SYNC_INTERVAL_MINUTES = 60;

export type SyncStatus = "idle" | "syncing" | "error";

interface SyncState {
  status: SyncStatus;
  error?: Error;
  progress?: {
    current: number;
    total: number;
  };
}

let syncState: SyncState = { status: "idle" };
let backgroundSyncTimer: NodeJS.Timeout | null = null;

export function getSyncStatus(): SyncState {
  return { ...syncState };
}

export async function syncFromLokalise(
  onProgress?: (current: number, total: number) => void,
): Promise<{ success: boolean; error?: Error; keysCount: number }> {
  // Prevent concurrent syncs
  if (syncState.status === "syncing") {
    return { success: false, error: new Error("Sync already in progress"), keysCount: 0 };
  }

  syncState = { status: "syncing" };

  try {
    await clearDatabase();

    let page = 1;
    let hasMore = true;
    let totalProcessed = 0;

    let currentBatch: ProcessedTranslationKey[] = [];
    let chunkIndex = 0;

    while (hasMore) {
      console.log(`Fetching page ${page} with limit ${LOKALISE_API_PAGE_SIZE}...`);

      let keys = await client.listKeys({
        limit: LOKALISE_API_PAGE_SIZE,
        page,
        includeTranslations: true,
        includeScreenshots: true,
      });

      const keysCount = keys.length;
      console.log(`Received ${keysCount} keys from page ${page}`);

      if (keysCount === 0) {
        console.log("No more keys, stopping pagination");
        hasMore = false;
        break;
      }

      let processed = client.processKeys(keys, getLanguageName);

      // Clear raw keys from memory immediately
      keys = [];

      for (const key of processed) {
        currentBatch.push(key);
        totalProcessed++;

        // When batch is full, write chunk to disk and clear memory
        if (currentBatch.length >= CHUNK_SIZE) {
          await writeChunk(currentBatch, chunkIndex);
          chunkIndex++;
          currentBatch = []; // Clear batch to free memory
        }

        if (totalProcessed % CHUNK_SIZE === 0) {
          const estimatedTotal = totalProcessed + (keysCount === LOKALISE_API_PAGE_SIZE ? LOKALISE_API_PAGE_SIZE : 0);
          onProgress?.(totalProcessed, estimatedTotal);
          syncState.progress = { current: totalProcessed, total: estimatedTotal };
        }
      }

      // Clear processed array from memory
      processed = [];

      // Continue fetching as long as we got keys
      // The API might return fewer keys than limit even if there are more pages
      page++;

      // Safety check to prevent infinite loops
      if (page > MAX_PAGES_SAFETY_LIMIT) {
        console.log(`Reached safety limit of ${MAX_PAGES_SAFETY_LIMIT} pages`);
        throw new Error("Too many pages - possible infinite loop or very large dataset");
      }
    }

    // Write any remaining keys in the batch
    if (currentBatch.length > 0) {
      await writeChunk(currentBatch, chunkIndex);
      currentBatch = [];
    }

    if (totalProcessed === 0) {
      syncState = { status: "idle" };
      await setLastSyncTime(Date.now());
      return { success: true, keysCount: 0 };
    }

    await setLastSyncTime(Date.now());

    // Force cache invalidation so next read loads fresh data
    invalidateCache();

    syncState = { status: "idle" };

    return { success: true, keysCount: totalProcessed };
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error during sync");
    syncState = { status: "error", error: err };
    return { success: false, error: err, keysCount: 0 };
  }
}

export function startBackgroundSync(intervalMinutes: number = DEFAULT_BACKGROUND_SYNC_INTERVAL_MINUTES): void {
  stopBackgroundSync();

  backgroundSyncTimer = setInterval(
    () => {
      // Only sync if not already syncing
      if (syncState.status === "idle") {
        syncFromLokalise().catch((error) => {
          console.error("Background sync failed:", error);
        });
      }
    },
    intervalMinutes * 60 * 1000,
  );
}

export function stopBackgroundSync(): void {
  if (backgroundSyncTimer) {
    clearInterval(backgroundSyncTimer);
    backgroundSyncTimer = null;
  }
}

export async function needsInitialSync(): Promise<boolean> {
  return !(await hasKeys());
}
