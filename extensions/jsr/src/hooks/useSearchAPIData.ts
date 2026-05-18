import * as cheerio from "cheerio";
import { useCallback, useRef } from "react";

import { captureException, environment } from "@raycast/api";
import { useFetch, useLocalStorage } from "@raycast/utils";

type SearchAPIData = {
  projectId: string;
  apiKey: string;
};

type CachedSearchAPIData = SearchAPIData & {
  cachedAt: number;
};

const STORAGE_KEY = "jsr-orama-creds";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REFRESHES_PER_SESSION = 3;
const MIN_REFRESH_INTERVAL_MS = 5_000;

const isExpired = (entry: CachedSearchAPIData | undefined | null): boolean => {
  if (!entry) return true;
  return Date.now() - entry.cachedAt > TTL_MS;
};

/**
 * Parse the Fresh `boot(...)` payload to extract `{projectId, apiKey}`.
 *
 * jsr.io migrated from Next.js (Orama v1: apiKey + indexId) to Fresh
 * (Orama v2: projectId + apiKey). The boot payload encodes a JSON array
 * containing an object whose `projectId`/`apiKey` properties are numeric
 * indexes into the array, pointing at the string values.
 */
const parseBootPayload = (html: string): SearchAPIData | null => {
  const $ = cheerio.load(html);
  let result: SearchAPIData | null = null;

  $("script").each((_index, element) => {
    if (result) return;
    const script = $(element).html();
    if (!script || !script.includes("apiKey")) return;

    const match = script.match(/("\[\[(?:[^"\\]|\\.)*\]")/);
    if (!match) return;

    try {
      const bootStr = JSON.parse(match[1]) as string;
      const arr = JSON.parse(bootStr) as unknown[];
      for (const item of arr) {
        if (
          item &&
          typeof item === "object" &&
          "projectId" in item &&
          "apiKey" in item &&
          typeof (item as Record<string, unknown>).projectId === "number" &&
          typeof (item as Record<string, unknown>).apiKey === "number"
        ) {
          const pi = (item as Record<string, number>).projectId;
          const ai = (item as Record<string, number>).apiKey;
          const projectId = arr[pi];
          const apiKey = arr[ai];
          if (typeof projectId === "string" && typeof apiKey === "string") {
            result = { projectId, apiKey };
            return;
          }
        }
      }
    } catch (err) {
      captureException(err);
    }
  });

  return result;
};

/**
 * Download the jsr.io frontpage and extract the Orama Cloud `projectId` + `apiKey`.
 *
 * Credentials are cached in LocalStorage for 7 days. On a stale/missing cache,
 * the hook scrapes the homepage. Consumers can call `refresh()` (e.g. on a
 * 401 from the search endpoint) to invalidate the cache and re-scrape; this
 * is rate-limited and capped per session to prevent infinite refresh loops.
 */
export const useSearchAPIData = () => {
  const {
    value: cached,
    setValue,
    removeValue,
    isLoading: isCacheLoading,
  } = useLocalStorage<CachedSearchAPIData | null>(STORAGE_KEY, null);

  const refreshCountRef = useRef(0);
  const lastRefreshAtRef = useRef(0);

  const cacheValid = !!cached && !isExpired(cached);
  const shouldScrape = !isCacheLoading && !cacheValid;

  const {
    data: scraped,
    isLoading: isScraping,
    error,
    revalidate,
  } = useFetch<SearchAPIData | null>("https://jsr.io", {
    method: "GET",
    headers: {
      Agent: `Raycast/${environment.raycastVersion} ${environment.extensionName} (https://raycast.com)`,
    },
    execute: shouldScrape,
    keepPreviousData: true,
    parseResponse: async (response) => {
      const text = await response.text();
      return parseBootPayload(text);
    },
    onData: (data) => {
      if (data) {
        void setValue({ ...data, cachedAt: Date.now() });
      }
    },
    onError: (err) => {
      captureException(err);
    },
  });

  const refresh = useCallback(async () => {
    if (refreshCountRef.current >= MAX_REFRESHES_PER_SESSION) return;
    if (Date.now() - lastRefreshAtRef.current < MIN_REFRESH_INTERVAL_MS) return;
    refreshCountRef.current += 1;
    lastRefreshAtRef.current = Date.now();
    await removeValue();
    revalidate();
  }, [removeValue, revalidate]);

  const data: SearchAPIData | null = cacheValid
    ? { projectId: cached.projectId, apiKey: cached.apiKey }
    : (scraped ?? null);

  return {
    data,
    isLoading: isCacheLoading || (shouldScrape && isScraping),
    error,
    refresh,
  };
};
