/**
 * Typed wrapper around @raycast/utils's `useCachedPromise` for Codeforces API calls.
 */

import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { CODEFORCES_API_BASE } from "../constants";
import type { ApiResponse } from "../types/codeforces";

export type QueryParams = Record<string, string | number | boolean | Array<string | number>>;

/**
 * Build a Codeforces-style query string from params.
 */
export function buildQueryParams(params?: QueryParams): string {
  if (!params) return "";
  const parts: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      const joined = value.map((v) => String(v)).join(";");
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(joined)}`);
    } else if (typeof value === "boolean") {
      parts.push(`${encodeURIComponent(key)}=${value ? "true" : "false"}`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }

  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/**
 * The core fetcher function for the Codeforces API.
 * It handles URL construction, the fetch request, and checking the response status.
 * Throws an error if the network request fails or if the API returns a "FAILED" status.
 */
async function fetchCodeforces<T>(methodPath: string, params?: QueryParams): Promise<ApiResponse<T>> {
  const query = buildQueryParams(params);
  const url = `${CODEFORCES_API_BASE}${methodPath}${query}`;

  const response = await fetch(url, {
    // Assign User-Agent to hopefully minimize bot detection issues
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Network request failed: ${response.statusText}`);
  }

  const json = (await response.json()) as ApiResponse<T>;

  if (json.status !== "OK") {
    throw new Error(json.comment || "Codeforces API returned status 'FAILED'");
  }

  return json;
}

/**
 * Normalize params by creating a new object with sorted keys.
 * This ensures stable cache keys even when object key order changes.
 */
function normalizeParams(params?: QueryParams): QueryParams | undefined {
  if (!params) return undefined;
  const sortedEntries = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(sortedEntries) as QueryParams;
}

/**
 * A generic, non-paginated hook for fetching data from the Codeforces API.
 *
 * It uses `@raycast/utils/useCachedPromise` for caching and revalidation.
 * It handles API-level errors and network errors, showing a failure toast.
 */
export function useCodeforces<T>(methodPath: string, params?: QueryParams) {
  // Normalize params to reduce unnecessary re-fetches or cache misses.
  // Sorting keys ensures stable cache keys even when object key order changes.
  const normalizedParams = normalizeParams(params);

  const { isLoading, data, error, revalidate } = useCachedPromise(
    (path, p) => fetchCodeforces<T>(path, p),
    [methodPath, normalizedParams],
    {
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (!error) return;
    showFailureToast(error, { title: "Could not fetch data" });
  }, [error]);

  return {
    isLoading,
    error,
    result: data?.result, // backwards-compatible: components expect the `result` field
    raw: data, // The full ApiResponse
    revalidate,
  };
}
