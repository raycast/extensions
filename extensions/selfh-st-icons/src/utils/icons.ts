/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fs from "fs";
import path from "path";
import os from "os";
import { getPreferences } from "./preferences";

/**
 * Structure of each entry in the icons.json index file.
 * Represents metadata about an icon in the selfh.st collection.
 */
export interface IconIndexEntry {
  /** Display name of the icon */
  Name: string;
  /** Reference name used in URLs and filenames */
  Reference: string;
  /** Whether SVG format is available */
  SVG: "Yes" | "No";
  /** Whether PNG format is available */
  PNG: "Yes" | "No";
  /** Whether WebP format is available */
  WebP: "Yes" | "No";
  /** Whether light variant is available */
  Light: "Yes" | "No";
  /** Whether dark variant is available */
  Dark: "Yes" | "No";
  /** Icon category for grouping */
  Category: string;
  /** Comma-separated list of search tags */
  Tags: string;
  /** Creation timestamp */
  CreatedAt: string;
}

// Configuration constants
const ICON_INDEX_URL =
  "https://raw.githubusercontent.com/selfhst/cdn/main/directory/icons.json";
const ICON_INDEX_KEY = "iconIndex";
const ICON_INDEX_LAST_FETCHED_KEY = "iconIndexLastFetched";
const ICON_CDN_BASE_URL = "https://cdn.jsdelivr.net/gh/selfhst/icons";

/**
 * Base error class for icon-related operations
 */
export class IconError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "IconError";
  }
}

/**
 * Error thrown when network operations fail
 */
export class NetworkError extends IconError {
  constructor(message: string) {
    super(message, "NETWORK_ERROR");
  }
}

/**
 * Error thrown when cache operations fail
 */
export class CacheError extends IconError {
  constructor(message: string) {
    super(message, "CACHE_ERROR");
  }
}

/**
 * Error thrown when parsing operations fail
 */
export class ParseError extends IconError {
  constructor(message: string) {
    super(message, "PARSE_ERROR");
  }
}

/**
 * Error thrown when download operations fail
 */
export class DownloadError extends IconError {
  constructor(message: string) {
    super(message, "DOWNLOAD_ERROR");
  }
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Helper to delay execution
 * @param ms - Number of milliseconds to delay
 * @returns Promise that resolves after the delay
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Validates the structure of icon index data
 * @param data - Data to validate
 * @returns Type guard indicating if data is valid IconIndexEntry array
 */
function validateIconIndex(data: unknown): data is IconIndexEntry[] {
  if (!Array.isArray(data)) return false;
  return data.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof item.Name === "string" &&
      typeof item.Reference === "string" &&
      typeof item.Category === "string" &&
      ["Yes", "No"].includes(item.PNG as string) &&
      ["Yes", "No"].includes(item.SVG as string) &&
      ["Yes", "No"].includes(item.WebP as string) &&
      ["Yes", "No"].includes(item.Light as string) &&
      ["Yes", "No"].includes(item.Dark as string),
  );
}

/**
 * Fetches the icon index from remote with retry mechanism
 * @param retryCount - Current retry attempt number
 * @returns Promise resolving to array of icon entries
 * @throws {NetworkError} When network operations fail
 * @throws {ParseError} When response parsing fails
 */
export async function refreshIconIndex(
  retryCount = 0,
): Promise<IconIndexEntry[]> {
  try {
    const response = await fetch(ICON_INDEX_URL);
    if (!response.ok) {
      throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!validateIconIndex(data)) {
      throw new ParseError("Invalid icon index data structure");
    }

    await LocalStorage.setItem(ICON_INDEX_KEY, JSON.stringify(data));
    await LocalStorage.setItem(
      ICON_INDEX_LAST_FETCHED_KEY,
      Date.now().toString(),
    );
    return data;
  } catch (err) {
    if (err instanceof IconError) throw err;

    if (retryCount < MAX_RETRIES) {
      await delay(RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
      return refreshIconIndex(retryCount + 1);
    }

    if (err instanceof SyntaxError) {
      throw new ParseError("Failed to parse icon index JSON");
    }
    throw new NetworkError(
      err instanceof Error ? err.message : "Unknown network error",
    );
  }
}

/**
 * Gets the icon index, using cache if valid unless forceRefresh is true.
 * Returns cached data if fetch fails and cache exists.
 *
 * @param options - Options for getting the icon index
 * @param options.forceRefresh - Whether to force a refresh from remote
 * @returns Promise resolving to object containing icon data and metadata
 * @throws {CacheError} When cache operations fail
 * @throws {NetworkError} When network operations fail and no cache is available
 */
export async function getIconIndex({
  forceRefresh = false,
}: { forceRefresh?: boolean } = {}): Promise<{
  data: IconIndexEntry[];
  fromCache: boolean;
  error?: string;
  lastFetched?: number;
}> {
  try {
    if (!forceRefresh) {
      const [cached, lastFetchedStr] = await Promise.all([
        LocalStorage.getItem<string>(ICON_INDEX_KEY),
        LocalStorage.getItem<string>(ICON_INDEX_LAST_FETCHED_KEY),
      ]);

      if (cached && lastFetchedStr) {
        const lastFetched = parseInt(lastFetchedStr, 10);
        if (!isNaN(lastFetched)) {
          const age = Date.now() - lastFetched;
          const prefs = await getPreferences();
          const cacheDurationMs = prefs.refreshInterval * 60 * 60 * 1000; // Convert hours to milliseconds

          if (age < cacheDurationMs) {
            try {
              const data = JSON.parse(cached);
              if (validateIconIndex(data)) {
                return { data, fromCache: true, lastFetched };
              }
            } catch {
              // If parsing fails, continue to fetch
            }
          }
        }
      }
    }

    const data = await refreshIconIndex();
    return { data, fromCache: false, lastFetched: Date.now() };
  } catch (error) {
    // Try to use cached data as fallback
    try {
      const [cached, lastFetchedStr] = await Promise.all([
        LocalStorage.getItem<string>(ICON_INDEX_KEY),
        LocalStorage.getItem<string>(ICON_INDEX_LAST_FETCHED_KEY),
      ]);

      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (validateIconIndex(data)) {
            const lastFetched =
              lastFetchedStr && !isNaN(parseInt(lastFetchedStr, 10))
                ? parseInt(lastFetchedStr, 10)
                : undefined;
            return {
              data,
              fromCache: true,
              lastFetched,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        } catch {
          // If parsing fails, throw original error
        }
      }
    } catch {
      // If fallback fails, throw original error
    }

    throw error;
  }
}

/**
 * Generates a CDN URL for an icon given its reference, format, and variant.
 *
 * @param reference - The icon's reference name (e.g., 'home-assistant')
 * @param format - The file format: 'png', 'webp', or 'svg'
 * @param variant - The variant: 'default', 'light', or 'dark'
 * @returns The complete CDN URL for the icon
 */
export function getIconCdnUrl(
  reference: string,
  format: "png" | "webp" | "svg",
  variant: "default" | "light" | "dark" = "default",
): string {
  let variantSuffix = "";
  if (variant === "light") {
    variantSuffix = "-light";
  } else if (variant === "dark") {
    variantSuffix = "-dark";
  }
  return `${ICON_CDN_BASE_URL}/${format}/${reference}${variantSuffix}.${format}`;
}

/**
 * Downloads an icon file from the CDN to the specified location
 */
export async function downloadIconFile(
  url: string,
  filename: string,
  downloadLocation: string,
): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const error = new NetworkError(
        `HTTP ${response.status}: ${response.statusText}`,
      );
      await showFailureToast({
        title: "Failed to download icon",
        message: error.message,
      });
      throw error;
    }

    const buffer = await response.arrayBuffer();
    const targetPath = path.join(
      downloadLocation.replace(/^~/, os.homedir()),
      filename,
    );

    try {
      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    } catch {
      // Directory may already exist
    }

    await fs.promises.writeFile(targetPath, Buffer.from(buffer));
  } catch (err) {
    if (err instanceof IconError) {
      await showFailureToast({
        title: "Icon Download Failed",
        message: err.message,
      });
      throw err;
    }
    const error = new DownloadError(
      err instanceof Error ? err.message : "Failed to download icon",
    );
    await showFailureToast({
      title: "Icon Download Failed",
      message: error.message,
    });
    throw error;
  }
}
