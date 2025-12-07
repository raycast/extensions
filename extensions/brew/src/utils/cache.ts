/**
 * Cache utilities for the Brew extension.
 *
 * Provides functions for managing cached data and remote fetching.
 */

import { environment } from "@raycast/api";
import path from "path";
import fs from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import { ReadableStream } from "stream/web";
import { chain } from "stream-chain";
import { parser } from "stream-json";
import { filter } from "stream-json/filters/Filter";
import { streamArray } from "stream-json/streamers/StreamArray";
import { pipeline as streamPipeline } from "stream/promises";
import { Remote, DownloadProgressCallback } from "./types";
import { cacheLogger, fetchLogger } from "./logger";
import { NetworkError, ParseError, isNetworkError, isRecoverableError } from "./errors";
import { wait } from "./async";
import { preferences } from "./preferences";

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

/** Maximum number of retry attempts for network requests */
const MAX_FETCH_RETRIES = 2;
/** Delay between retry attempts in milliseconds */
const RETRY_DELAY_MS = 1000;

export async function fetchRemote<T>(remote: Remote<T>, onProgress?: DownloadProgressCallback): Promise<T[]> {
  if (remote.value) {
    // Already cached in memory
    onProgress?.({
      url: remote.url,
      bytesDownloaded: 0,
      totalBytes: 0,
      percent: 100,
      complete: true,
    });
    return remote.value;
  } else if (remote.fetch) {
    return remote.fetch;
  } else {
    remote.fetch = _fetchRemoteWithRetry(remote, onProgress)
      .then((value) => {
        remote.value = value;
        return value;
      })
      .finally(() => {
        remote.fetch = undefined;
      });
    return remote.fetch;
  }
}

/**
 * Fetch remote data with automatic retry for transient network errors.
 */
async function _fetchRemoteWithRetry<T>(remote: Remote<T>, onProgress?: DownloadProgressCallback): Promise<T[]> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_FETCH_RETRIES; attempt++) {
    try {
      return await _fetchRemote(remote, attempt, onProgress);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry for recoverable errors (network issues)
      if (!isRecoverableError(error) || attempt >= MAX_FETCH_RETRIES) {
        throw lastError;
      }

      fetchLogger.warn("Fetch failed, retrying", {
        url: remote.url,
        attempt: attempt + 1,
        maxRetries: MAX_FETCH_RETRIES,
        error: lastError.message,
      });

      // Wait before retrying
      await wait(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError;
}

async function _fetchRemote<T>(
  remote: Remote<T>,
  attempt: number,
  onProgress?: DownloadProgressCallback,
): Promise<T[]> {
  const fetchStartTime = Date.now();
  fetchLogger.log("Fetching remote", { url: remote.url, attempt });

  async function fetchURL(): Promise<void> {
    const downloadStartTime = Date.now();
    fetchLogger.log("Starting download", { url: remote.url });

    try {
      // Request uncompressed data so Content-Length matches actual bytes for accurate progress
      const response = await fetch(remote.url, {
        headers: {
          "Accept-Encoding": "identity",
        },
      });
      if (!response.ok || !response.body) {
        throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`, {
          statusCode: response.status,
          url: remote.url,
        });
      }

      // Track response size for progress reporting
      // With Accept-Encoding: identity, Content-Length should match actual bytes
      const contentLength = response.headers.get("content-length");
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      // Track bytes for progress reporting
      let bytesDownloaded = 0;

      // Report initial progress
      onProgress?.({
        url: remote.url,
        bytesDownloaded: 0,
        totalBytes,
        percent: 0,
        complete: false,
      });

      // If we have a progress callback, use a transform stream to track progress
      // Otherwise, stream directly to avoid overhead
      if (onProgress) {
        // Throttle progress updates to avoid render loops (max once per 100ms)
        let lastProgressUpdate = 0;
        const PROGRESS_THROTTLE_MS = 100;

        const progressStream = new TransformStream({
          transform(chunk, controller) {
            bytesDownloaded += chunk.length;
            const now = Date.now();

            // Only report progress if enough time has passed
            if (now - lastProgressUpdate >= PROGRESS_THROTTLE_MS) {
              const percent = totalBytes > 0 ? Math.round((bytesDownloaded / totalBytes) * 100) : -1;
              lastProgressUpdate = now;

              onProgress({
                url: remote.url,
                bytesDownloaded,
                totalBytes,
                percent,
                complete: false,
              });
            }

            controller.enqueue(chunk);
          },
        });

        // Pipe through progress tracker
        const progressBody = response.body.pipeThrough(progressStream);
        await streamPipeline(Readable.fromWeb(progressBody as ReadableStream), fs.createWriteStream(remote.cachePath));
      } else {
        // Direct stream without progress tracking
        await streamPipeline(Readable.fromWeb(response.body as ReadableStream), fs.createWriteStream(remote.cachePath));
      }

      // Report completion
      onProgress?.({
        url: remote.url,
        bytesDownloaded,
        totalBytes,
        percent: 100,
        complete: true,
      });

      const downloadDurationMs = Date.now() - downloadStartTime;

      // Log cache update with size metrics
      const logData: Record<string, unknown> = {
        path: remote.cachePath,
        url: remote.url,
        downloadDurationMs,
      };

      if (totalBytes > 0) {
        const contentLengthKb = (totalBytes / 1024).toFixed(2);
        logData.responseSizeBytes = totalBytes;
        logData.responseSizeKb = `${contentLengthKb} KB`;
      }

      if (preferences.useInternalApi) {
        logData.usingInternalApi = true;
      }

      cacheLogger.log("Cache updated from remote", logData);
    } catch (error) {
      const downloadDurationMs = Date.now() - downloadStartTime;
      fetchLogger.error("Download failed", { url: remote.url, durationMs: downloadDurationMs, error });

      if (isNetworkError(error)) {
        throw error;
      }
      // Wrap fetch errors as NetworkError for retry logic
      throw new NetworkError(`Failed to fetch ${remote.url}`, {
        cause: error instanceof Error ? error : undefined,
        url: remote.url,
      });
    }
  }

  async function updateCache(): Promise<void> {
    let cacheInfo: fs.Stats | undefined;
    let lastModified = 0;
    try {
      cacheInfo = await stat(remote.cachePath);
      const response = await fetch(remote.url, { method: "HEAD" });
      lastModified = Date.parse(response.headers.get("last-modified") ?? "");
    } catch {
      cacheLogger.log("Cache miss", { path: remote.cachePath });
    }
    if (!cacheInfo || cacheInfo.size == 0 || lastModified > cacheInfo.mtimeMs) {
      await fetchURL();
    } else {
      fetchLogger.log("Using cached data (up to date)", {
        url: remote.url,
        cacheAgeMs: Date.now() - cacheInfo.mtimeMs,
      });
    }
  }

  async function readCache(): Promise<T[]> {
    const parseStartTime = Date.now();
    fetchLogger.log("Parsing cache", { path: remote.cachePath });

    const keysRe = new RegExp(`\\b(${valid_keys.join("|")})\\b`);

    return new Promise<T[]>((resolve, reject) => {
      const value: T[] = [];
      // Throttle processing progress updates (max once per 100ms)
      let lastProgressUpdate = 0;
      const PROGRESS_THROTTLE_MS = 100;

      /** Report processing progress to callback */
      const reportProgress = (complete: boolean) => {
        onProgress?.({
          url: remote.url,
          bytesDownloaded: 0,
          totalBytes: 0,
          percent: 100, // Download is complete
          complete,
          phase: "processing",
          itemsProcessed: value.length,
          totalItems: complete ? value.length : undefined,
        });
      };

      // stream-json/chain is quite slow, so unfortunately not suitable for real-time queries.
      // migrating to a sqlite backend _might_ help, although the bootstrap cost
      // (each time json response changes) will probably be high.
      const pipeline = chain([
        fs.createReadStream(remote.cachePath),
        parser(),
        filter({ filter: keysRe }),
        streamArray(),
      ]);
      pipeline.on("data", (data) => {
        if (data && typeof data === "object" && "value" in data) {
          value.push(data.value);

          // Report processing progress (throttled)
          const now = Date.now();
          if (onProgress && now - lastProgressUpdate >= PROGRESS_THROTTLE_MS) {
            lastProgressUpdate = now;
            reportProgress(false);
          }
        }
      });
      pipeline.on("end", () => {
        const parseDurationMs = Date.now() - parseStartTime;
        const totalDurationMs = Date.now() - fetchStartTime;
        fetchLogger.log("Fetch completed", {
          url: remote.url,
          itemCount: value.length,
          parseDurationMs,
          totalDurationMs,
        });
        reportProgress(true);
        resolve(value);
      });
      pipeline.on("error", (err) => {
        const parseDurationMs = Date.now() - parseStartTime;
        // Cache parsing failed, remove corrupted cache and retry
        cacheLogger.warn("Cache parse error, removing corrupted cache", {
          path: remote.cachePath,
          error: err.message,
          parseDurationMs,
        });
        fs.rmSync(remote.cachePath);
        reject(
          new ParseError("Failed to parse cached data", {
            cause: err,
          }),
        );
      });
    });
  }

  return updateCache().then(readCache);
}
