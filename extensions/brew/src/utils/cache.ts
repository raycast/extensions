/**
 * Cache utilities for the Brew extension.
 *
 * Provides functions for managing cached data and remote fetching.
 */

import { environment, showToast, Toast } from "@raycast/api";
import path from "path";
import fs from "fs";
import { rm, mkdir, readFile, writeFile } from "fs/promises";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { ReadableStream } from "stream/web";
import { chain } from "stream-chain";
import { parser } from "stream-json";
import { filter } from "stream-json/filters/Filter";
import { streamArray } from "stream-json/streamers/StreamArray";
import { pipeline as streamPipeline } from "stream/promises";
import { DownloadProgressCallback, ChunkedCacheConfig, ChunkedCacheMeta, CacheIndex, IndexEntry } from "./types";
import { cacheLogger, fetchLogger } from "./logger";
import { NetworkError, ParseError, ensureError } from "./errors";

/// Cache Paths

export const supportPath: string = (() => {
  try {
    fs.mkdirSync(environment.supportPath, { recursive: true });
  } catch {
    cacheLogger.warn("Failed to create supportPath");
  }
  return environment.supportPath;
})();

export const bundleIdentifier: string = (() => {
  return (
    environment.supportPath.split(path.sep).find((comp) => {
      if (comp.startsWith("com.raycast")) {
        return true;
      }
      return false;
    }) ?? "com.raycast.macos"
  );
})();

export function cachePath(name: string): string {
  return path.join(supportPath, name);
}

const CACHE_FILES = ["formula.json", "cask.json", "installedv2.json"];

/**
 * Clear all cached data files (formulae, casks, installed packages).
 */
export async function clearCache(): Promise<void> {
  try {
    cacheLogger.log("Starting cache clear operation");
    await showToast(Toast.Style.Animated, "Clearing downloaded casks and formulae...");

    // Check which files exist before clearing
    const existingFiles: string[] = [];
    const fileSizes: Record<string, number> = {};

    for (const file of CACHE_FILES) {
      const filePath = path.join(environment.supportPath, file);
      try {
        const stats = await stat(filePath);
        existingFiles.push(file);
        fileSizes[file] = stats.size;
      } catch {
        // File doesn't exist
      }
    }

    if (existingFiles.length > 0) {
      cacheLogger.log("Clearing cache files", {
        files: existingFiles,
        sizes: fileSizes,
        totalBytes: Object.values(fileSizes).reduce((a, b) => a + b, 0),
      });
    } else {
      cacheLogger.log("No cache files to clear");
    }

    await Promise.all([
      // Clear legacy cache files
      ...CACHE_FILES.map((file) =>
        rm(path.join(environment.supportPath, file), { force: true }).catch(() => {
          // Ignore errors for files that don't exist
        }),
      ),
      // Clear chunked cache directories
      rm(path.join(environment.supportPath, "formula"), { recursive: true, force: true }).catch(() => {}),
      rm(path.join(environment.supportPath, "cask"), { recursive: true, force: true }).catch(() => {}),
    ]);

    cacheLogger.log("Cache clear completed", {
      filesCleared: existingFiles,
      fileCount: existingFiles.length,
    });

    await showToast(Toast.Style.Success, "Cache files cleared");
  } catch (err) {
    const error = ensureError(err);
    cacheLogger.error("Failed to clear cache", { error: error.message });
    await showToast(Toast.Style.Failure, "Failed to clear cache", error.message);
  }
}

/// Remote Fetching

// Top-level object keys which should be parsed from the raw JSON objects.
const valid_keys = [
  "name",
  "tap",
  "desc",
  "homepage",
  "versions",
  "outdated",
  "caveats",
  "token",
  "version",
  "installed",
  "auto_updates",
  "depends_on",
  "conflicts_with",
  "license",
  "aliases",
  "dependencies",
  "build_dependencies",
  "installed",
  "keg_only",
  "linked_key",
  "pinned",
];

/**
 * Download remote data to cache file WITHOUT parsing into memory.
 * Use this when you only need the file on disk (e.g., for chunked cache building).
 * Returns the last-modified timestamp from the remote.
 */
export async function downloadRemoteToCache(
  url: string,
  cachePath: string,
  onProgress?: DownloadProgressCallback,
  signal?: AbortSignal,
): Promise<number> {
  // Check if cache is already up to date
  let cacheInfo: fs.Stats | undefined;
  let lastModified = 0;
  try {
    cacheInfo = await stat(cachePath);
    const response = await fetch(url, { method: "HEAD", signal });
    lastModified = Date.parse(response.headers.get("last-modified") ?? "");
  } catch (err) {
    // Re-throw abort errors, ignore others (cache miss is normal on first run)
    if (err instanceof Error && err.name === "AbortError") throw err;
    cacheLogger.log("Cache miss for download", { path: cachePath });
  }

  if (cacheInfo && cacheInfo.size > 0 && lastModified <= cacheInfo.mtimeMs) {
    fetchLogger.log("Using cached file (up to date)", {
      url,
      cacheAgeMs: Date.now() - cacheInfo.mtimeMs,
    });
    return lastModified || cacheInfo.mtimeMs;
  }

  // Need to download
  const downloadStartTime = Date.now();
  fetchLogger.log("Starting download (no parse)", { url });

  const response = await fetch(url, {
    headers: {
      "Accept-Encoding": "identity",
    },
    signal,
  });

  if (!response.ok || !response.body) {
    throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`, {
      statusCode: response.status,
      url,
    });
  }

  const contentLength = response.headers.get("content-length");
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
  let bytesDownloaded = 0;

  onProgress?.({
    url,
    bytesDownloaded: 0,
    totalBytes,
    percent: 0,
    complete: false,
  });

  const writeStream = fs.createWriteStream(cachePath);

  try {
    if (onProgress) {
      let lastProgressUpdate = 0;
      const PROGRESS_THROTTLE_MS = 100;

      const progressStream = new TransformStream({
        transform(chunk, controller) {
          bytesDownloaded += chunk.length;
          const now = Date.now();

          const isComplete = totalBytes > 0 && bytesDownloaded >= totalBytes;
          if (isComplete || now - lastProgressUpdate >= PROGRESS_THROTTLE_MS) {
            const percent = totalBytes > 0 ? Math.round((bytesDownloaded / totalBytes) * 100) : -1;
            lastProgressUpdate = now;

            onProgress({
              url,
              bytesDownloaded,
              totalBytes,
              percent: Math.min(percent, 100),
              complete: false,
            });
          }

          controller.enqueue(chunk);
        },
      });

      const progressBody = response.body.pipeThrough(progressStream);
      await streamPipeline(Readable.fromWeb(progressBody as ReadableStream), writeStream);
    } else {
      await streamPipeline(Readable.fromWeb(response.body as ReadableStream), writeStream);
    }
  } catch (streamError) {
    writeStream.destroy();
    try {
      fs.unlinkSync(cachePath);
    } catch {
      // Ignore cleanup errors
    }
    throw streamError;
  }

  onProgress?.({
    url,
    bytesDownloaded,
    totalBytes,
    percent: 100,
    complete: true,
  });

  const downloadDurationMs = Date.now() - downloadStartTime;
  cacheLogger.log("Downloaded to cache (no parse)", {
    path: cachePath,
    url,
    downloadDurationMs,
    sizeBytes: totalBytes,
  });

  // Return the last-modified time
  lastModified = Date.parse(response.headers.get("last-modified") ?? "") || Date.now();
  return lastModified;
}

/// Chunked Cache

/** Number of items per chunk file */
const CHUNK_SIZE = 500;

/** Current schema version for chunked cache */
const CHUNKED_CACHE_VERSION = 1;

/**
 * Get configuration for chunked cache paths.
 */
export function getChunkedCacheConfig(type: "formula" | "cask"): ChunkedCacheConfig {
  const baseDir = path.join(supportPath, type);
  return {
    baseDir,
    indexPath: path.join(baseDir, "index.json"),
    metaPath: path.join(baseDir, "meta.json"),
    type,
  };
}

/**
 * Get the path for a specific chunk file.
 */
function getChunkPath(config: ChunkedCacheConfig, chunkNumber: number): string {
  const paddedNumber = String(chunkNumber).padStart(4, "0");
  return path.join(config.baseDir, `chunk-${paddedNumber}.json`);
}

/**
 * Check if chunked cache is valid (exists and not stale).
 */
export async function isChunkedCacheValid(
  config: ChunkedCacheConfig,
  remoteUrl: string,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const metaContent = await readFile(config.metaPath, "utf-8");
    const meta = JSON.parse(metaContent) as ChunkedCacheMeta;

    // Check version compatibility
    if (meta.version !== CHUNKED_CACHE_VERSION) {
      cacheLogger.log("Chunked cache version mismatch", {
        type: config.type,
        cacheVersion: meta.version,
        currentVersion: CHUNKED_CACHE_VERSION,
      });
      return false;
    }

    // Check if remote has been updated
    const response = await fetch(remoteUrl, { method: "HEAD", signal });
    const lastModified = Date.parse(response.headers.get("last-modified") ?? "");

    if (lastModified > meta.lastModified) {
      cacheLogger.log("Chunked cache outdated", {
        type: config.type,
        cacheTime: meta.lastModified,
        remoteTime: lastModified,
      });
      return false;
    }

    cacheLogger.log("Chunked cache valid", {
      type: config.type,
      cacheAgeMs: Date.now() - meta.createdAt,
      itemCount: meta.totalItems,
    });
    return true;
  } catch (err) {
    // Re-throw abort errors, ignore others (missing cache is normal on first run)
    if (err instanceof Error && err.name === "AbortError") throw err;
    cacheLogger.log("Chunked cache not found or invalid", { type: config.type });
    return false;
  }
}

/** Type for index entry extractor function */
export type IndexExtractor<T> = (item: T, chunkNumber: number, indexInChunk: number) => IndexEntry;

/**
 * Build chunked cache from source JSON file.
 * Streams through the source, writing chunks and building an index.
 */
export async function buildChunkedCache<T>(
  sourcePath: string,
  sourceUrl: string,
  config: ChunkedCacheConfig,
  extractIndex: IndexExtractor<T>,
  onProgress?: DownloadProgressCallback,
  signal?: AbortSignal,
): Promise<void> {
  // Check for abort before starting
  if (signal?.aborted) {
    const error = new Error("Aborted");
    error.name = "AbortError";
    throw error;
  }

  const buildStartTime = Date.now();
  cacheLogger.log("Building chunked cache", { type: config.type, sourcePath });

  // Reset and ensure directory exists
  await rm(config.baseDir, { recursive: true, force: true }).catch(() => {});
  await mkdir(config.baseDir, { recursive: true });

  // Get last modified time from source file (will use this for cache validity)
  let lastModified = Date.now();
  try {
    const response = await fetch(sourceUrl, { method: "HEAD", signal });
    lastModified = Date.parse(response.headers.get("last-modified") ?? "") || lastModified;
  } catch (err) {
    // Re-throw abort errors, ignore others (use current time)
    if (err instanceof Error && err.name === "AbortError") throw err;
  }

  const keysRe = new RegExp(`\\b(${valid_keys.join("|")})\\b`);

  return new Promise<void>((resolve, reject) => {
    let aborted = false;
    const index: IndexEntry[] = [];
    let currentChunk: T[] = [];
    let chunkNumber = 0;
    let totalItems = 0;

    // Track progress
    let lastProgressUpdate = 0;
    const PROGRESS_THROTTLE_MS = 100;

    const reportProgress = (complete: boolean) => {
      if (aborted) return;
      onProgress?.({
        url: sourceUrl,
        bytesDownloaded: 0,
        totalBytes: 0,
        percent: 100,
        complete,
        phase: "processing",
        itemsProcessed: totalItems,
        totalItems: complete ? totalItems : undefined,
      });
    };

    // Pending write operations
    const writePromises: Promise<void>[] = [];

    const pipeline = chain([fs.createReadStream(sourcePath), parser(), filter({ filter: keysRe }), streamArray()]);

    // Abort handler: destroy the pipeline when signal fires
    const onAbort = () => {
      aborted = true;
      pipeline.destroy();
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    pipeline.on("data", (data) => {
      if (data && typeof data === "object" && "value" in data) {
        const item = data.value as T;
        const indexInChunk = currentChunk.length;

        // Build index entry
        const entry = extractIndex(item, chunkNumber, indexInChunk);
        index.push(entry);

        // Add to current chunk
        currentChunk.push(item);
        totalItems++;

        // Write chunk when full
        if (currentChunk.length >= CHUNK_SIZE) {
          // Capture current chunk for async write
          const chunkToWrite = currentChunk;
          const chunkNum = chunkNumber;
          currentChunk = [];
          chunkNumber++;

          writePromises.push(
            (async () => {
              const chunkPath = getChunkPath(config, chunkNum);
              await writeFile(chunkPath, JSON.stringify(chunkToWrite));
            })(),
          );
        }

        // Report progress (throttled)
        const now = Date.now();
        if (onProgress && now - lastProgressUpdate >= PROGRESS_THROTTLE_MS) {
          lastProgressUpdate = now;
          reportProgress(false);
        }
      }
    });

    pipeline.on("end", async () => {
      signal?.removeEventListener("abort", onAbort);
      try {
        // Wait for any pending chunk writes
        await Promise.all(writePromises);

        // Write final partial chunk
        if (currentChunk.length > 0) {
          const chunkPath = getChunkPath(config, chunkNumber);
          await writeFile(chunkPath, JSON.stringify(currentChunk));
          chunkNumber++;
        }

        // Write index
        await writeFile(config.indexPath, JSON.stringify(index));

        // Write meta
        const meta: ChunkedCacheMeta = {
          version: CHUNKED_CACHE_VERSION,
          sourceUrl,
          lastModified,
          createdAt: Date.now(),
          totalItems,
          chunkSize: CHUNK_SIZE,
          chunkCount: chunkNumber,
          type: config.type,
        };
        await writeFile(config.metaPath, JSON.stringify(meta));

        const buildDurationMs = Date.now() - buildStartTime;
        cacheLogger.log("Chunked cache built", {
          type: config.type,
          totalItems,
          chunkCount: chunkNumber,
          buildDurationMs,
        });

        reportProgress(true);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    pipeline.on("error", async (err) => {
      signal?.removeEventListener("abort", onAbort);

      // Clean up partial cache
      try {
        await rm(config.baseDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }

      // If aborted, reject with AbortError instead of ParseError
      if (aborted) {
        cacheLogger.log("Chunked cache build aborted", { type: config.type });
        const abortError = new Error("Aborted");
        abortError.name = "AbortError";
        reject(abortError);
        return;
      }

      cacheLogger.error("Failed to build chunked cache", {
        type: config.type,
        error: err.message,
      });

      reject(
        new ParseError("Failed to build chunked cache", {
          cause: err,
        }),
      );
    });
  });
}

/**
 * Load the index from chunked cache.
 */
export async function loadIndex(config: ChunkedCacheConfig): Promise<CacheIndex> {
  const [indexContent, metaContent] = await Promise.all([
    readFile(config.indexPath, "utf-8"),
    readFile(config.metaPath, "utf-8"),
  ]);

  const entries = JSON.parse(indexContent) as IndexEntry[];
  const meta = JSON.parse(metaContent) as ChunkedCacheMeta;

  cacheLogger.log("Loaded chunked index", {
    type: config.type,
    entryCount: entries.length,
  });

  return { entries, meta };
}

/**
 * Load specific chunks from chunked cache.
 * Returns a map of chunk number to items array.
 */
export async function loadChunks<T>(config: ChunkedCacheConfig, chunkNumbers: Set<number>): Promise<Map<number, T[]>> {
  const chunks = new Map<number, T[]>();

  if (chunkNumbers.size === 0) {
    return chunks;
  }

  const loadPromises = Array.from(chunkNumbers).map(async (chunkNum) => {
    const chunkPath = getChunkPath(config, chunkNum);
    const content = await readFile(chunkPath, "utf-8");
    const items = JSON.parse(content) as T[];
    return { chunkNum, items };
  });

  const results = await Promise.all(loadPromises);
  for (const { chunkNum, items } of results) {
    chunks.set(chunkNum, items);
  }

  cacheLogger.log("Loaded chunks", {
    type: config.type,
    chunkCount: chunks.size,
    totalItems: Array.from(chunks.values()).reduce((sum, items) => sum + items.length, 0),
  });

  return chunks;
}

/**
 * Load specific items from chunked cache based on index entries.
 * Groups entries by chunk to minimize file reads.
 */
export async function loadItemsFromChunks<T>(config: ChunkedCacheConfig, entries: IndexEntry[]): Promise<T[]> {
  if (entries.length === 0) {
    return [];
  }

  // Determine which chunks we need
  const neededChunks = new Set(entries.map((e) => e.c));

  // Load those chunks
  const chunks = await loadChunks<T>(config, neededChunks);

  // Extract items in entry order
  const items: T[] = [];
  for (const entry of entries) {
    const chunk = chunks.get(entry.c);
    if (chunk && entry.i < chunk.length) {
      items.push(chunk[entry.i]);
    }
  }

  return items;
}
