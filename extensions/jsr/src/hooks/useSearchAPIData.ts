import { useCallback, useRef } from "react";

import { environment } from "@raycast/api";
import { useFetch, useLocalStorage } from "@raycast/utils";

import { onErrorCapture } from "@/lib/errors";
import { jsrUrls } from "@/lib/jsrUrls";
import { type CachedOramaCreds, ORAMA_CACHE_KEY, isCachedOramaCredsExpired } from "@/lib/oramaCache";
import { type OramaCreds, parseBootPayload } from "@/lib/parseBootPayload";

const MAX_REFRESHES_PER_SESSION = 3;
const MIN_REFRESH_INTERVAL_MS = 5_000;

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
  } = useLocalStorage<CachedOramaCreds | null>(ORAMA_CACHE_KEY, null);

  const refreshCountRef = useRef(0);
  const lastRefreshAtRef = useRef(0);

  const cacheValid = !!cached && !isCachedOramaCredsExpired(cached);
  const shouldScrape = !isCacheLoading && !cacheValid;

  const {
    data: scraped,
    isLoading: isScraping,
    error,
    revalidate,
  } = useFetch<OramaCreds | null>(jsrUrls.site.home(), {
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
    onError: onErrorCapture,
  });

  const refresh = useCallback(async () => {
    if (refreshCountRef.current >= MAX_REFRESHES_PER_SESSION) return;
    if (Date.now() - lastRefreshAtRef.current < MIN_REFRESH_INTERVAL_MS) return;
    refreshCountRef.current += 1;
    lastRefreshAtRef.current = Date.now();
    await removeValue();
    revalidate();
  }, [removeValue, revalidate]);

  const data: OramaCreds | null = cacheValid
    ? { projectId: cached.projectId, apiKey: cached.apiKey }
    : (scraped ?? null);

  return {
    data,
    isLoading: isCacheLoading || (shouldScrape && isScraping),
    error,
    refresh,
  };
};
