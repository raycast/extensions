import { LocalStorage } from "@raycast/api";
import fs from "node:fs";
import { daw, type DawSet, type ProjectFileMetadata } from "@/daws";
import { LOG_PREFIX } from "@/core/log";

// Set 元数据（BPM、调号、拍号）的持久缓存，以 DawSet.metadataFile 为键。

type ProjectFileCacheEntry = {
  signature: string;
  metadata: ProjectFileMetadata;
};

export const EMPTY_METADATA: ProjectFileMetadata = {
  bpm: null,
  timeSignature: null,
  key: null,
};

// Search Projects 要给每个项目的最新 Set 留缓存，View Sets 也会用。每条约 150 字节，2000 条约 300 KB。
const CACHE_LIMIT = 2000;
// 沿用旧键名：改了只会让已有缓存全部作废、重新解析。
const STORAGE_KEY = "als-metadata-cache-v2";
const PARSER_VERSION = 1;

const cache = new Map<string, ProjectFileCacheEntry>();

let persistentCacheLoaded: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | undefined;

function fileSignature(stats: fs.Stats): string {
  return `${PARSER_VERSION}:${stats.mtimeMs}:${stats.size}`;
}

function evictOldest() {
  while (cache.size > CACHE_LIMIT) {
    const oldestPath = cache.keys().next().value;
    if (oldestPath === undefined) break;
    cache.delete(oldestPath);
  }
}

export async function loadPersistentProjectFileCache() {
  if (!persistentCacheLoaded) {
    persistentCacheLoaded = (async () => {
      try {
        const raw = await LocalStorage.getItem<string>(STORAGE_KEY);

        if (!raw) {
          return;
        }

        const entries = JSON.parse(raw) as Record<string, ProjectFileCacheEntry>;

        for (const [filePath, entry] of Object.entries(entries)) {
          if (typeof entry?.signature !== "string" || typeof entry?.metadata !== "object" || entry.metadata === null) {
            continue;
          }

          // 文件已经不在了（Set 被删、改名或移走）：丢掉，不占缓存名额。
          if (!fs.existsSync(filePath)) continue;

          cache.set(filePath, entry);
        }

        evictOldest();
      } catch (error) {
        console.error(`${LOG_PREFIX} Failed to load project file cache:`, error);
      }
    })();
  }

  await persistentCacheLoaded;
}

function schedulePersist() {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }

  persistTimer = setTimeout(() => {
    persistTimer = undefined;

    const snapshot = Object.fromEntries(cache);

    void LocalStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch((error) => {
      console.error(`${LOG_PREFIX} Failed to persist project file cache:`, error);
    });
  }, 200);
}

function cacheMetadata(filePath: string, signature: string, metadata: ProjectFileMetadata) {
  cache.delete(filePath);
  cache.set(filePath, { signature, metadata });

  evictOldest();
  schedulePersist();
}

/** 缓存加载后同步读取一个 Set 的元数据。没有缓存、或文件改过时返回 null。 */
export function cachedSetMetadata(set: DawSet): ProjectFileMetadata | null {
  const entry = cache.get(set.metadataFile);
  if (!entry) return null;
  try {
    return entry.signature === fileSignature(fs.statSync(set.metadataFile)) ? entry.metadata : null;
  } catch {
    return null;
  }
}

/** 解析一个 Set 并写入缓存。解析期间文件被改过就不缓存，下次重新解析。出错时抛出。 */
export async function parseSetMetadata(set: DawSet): Promise<ProjectFileMetadata> {
  const signature = fileSignature(fs.statSync(set.metadataFile));
  const metadata = await daw.parseSet(set);
  try {
    if (fileSignature(fs.statSync(set.metadataFile)) === signature) {
      cacheMetadata(set.metadataFile, signature, metadata);
    }
  } catch {
    // 缓存校验失败不影响返回结果
  }
  return metadata;
}
