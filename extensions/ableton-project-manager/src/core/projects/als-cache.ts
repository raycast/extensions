import { LocalStorage } from "@raycast/api";
import fs from "node:fs";

export type CachedAlsMetadata = {
  bpm: number | null;
  timeSignature: string | null;
  key: string | null;
};

export type AlsMetadataCacheEntry = {
  signature: string;
  metadata: CachedAlsMetadata;
};

export const EMPTY_METADATA: CachedAlsMetadata = {
  bpm: null,
  timeSignature: null,
  key: null,
};

const ALS_METADATA_CACHE_LIMIT = 100;
const ALS_METADATA_STORAGE_KEY = "als-metadata-cache-v2";
const ALS_PARSER_VERSION = 1;

const alsMetadataCache = new Map<string, AlsMetadataCacheEntry>();

let persistentCacheLoaded: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | undefined;

export function fileSignature(stats: fs.Stats): string {
  return `${ALS_PARSER_VERSION}:${stats.mtimeMs}:${stats.size}`;
}

function evictOldest() {
  while (alsMetadataCache.size > ALS_METADATA_CACHE_LIMIT) {
    const oldestPath = alsMetadataCache.keys().next().value;
    if (oldestPath === undefined) break;
    alsMetadataCache.delete(oldestPath);
  }
}

export async function loadPersistentAlsMetadataCache() {
  if (!persistentCacheLoaded) {
    persistentCacheLoaded = (async () => {
      try {
        const raw = await LocalStorage.getItem<string>(ALS_METADATA_STORAGE_KEY);

        if (!raw) {
          return;
        }

        const entries = JSON.parse(raw) as Record<string, AlsMetadataCacheEntry>;

        for (const [filePath, entry] of Object.entries(entries)) {
          if (typeof entry?.signature !== "string" || typeof entry?.metadata !== "object" || entry.metadata === null) {
            continue;
          }

          alsMetadataCache.set(filePath, entry);
        }

        evictOldest();
      } catch (error) {
        console.error("[Ableton Project Manager] Failed to load ALS cache:", error);
      }
    })();
  }

  await persistentCacheLoaded;
}

function schedulePersistAlsMetadataCache() {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }

  persistTimer = setTimeout(() => {
    persistTimer = undefined;

    const snapshot = Object.fromEntries(alsMetadataCache);

    void LocalStorage.setItem(ALS_METADATA_STORAGE_KEY, JSON.stringify(snapshot)).catch((error) => {
      console.error("[Ableton Project Manager] Failed to persist ALS cache:", error);
    });
  }, 200);
}

export function cacheAlsMetadata(filePath: string, signature: string, metadata: CachedAlsMetadata) {
  alsMetadataCache.delete(filePath);
  alsMetadataCache.set(filePath, { signature, metadata });

  evictOldest();
  schedulePersistAlsMetadataCache();
}

export function getCachedAlsMetadataEntry(filePath: string): AlsMetadataCacheEntry | undefined {
  return alsMetadataCache.get(filePath);
}
