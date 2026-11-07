import { showFailureToast, useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchCompanies } from "../api/prh";
import { getLanguageFallbackOrder, getPreferredLanguageCode } from "../lib/language";
import { classifyQuery } from "../lib/query";
import { getLanguage } from "../lib/localization";
import { translate } from "../lib/translations";
import { rankCompaniesForNameQuery } from "../lib/search-ranking";
import { toUiCompany } from "../lib/selectors";
import type { QueryClassification, UiCompany } from "../types/ui";

export { classifyQuery } from "../lib/query";

const SEARCH_CACHE_STORAGE_KEY = "prh-search-cache-v2";
const SEARCH_CACHE_TTL_MS = 120_000;
const SEARCH_CACHE_RETENTION_MS = 86_400_000;
const SEARCH_CACHE_MAX_ENTRIES = 100;
const NAME_QUERY_DEBOUNCE_MS = 180;

interface SearchCacheEntry {
  timestampMs: number;
  companies: UiCompany[];
  totalResults: number;
}

type PersistedSearchCache = Record<string, SearchCacheEntry>;

const searchCache = new Map<string, SearchCacheEntry>();

function getCacheBaseKey(classification: QueryClassification): string | undefined {
  if (classification.kind === "businessId" && classification.normalizedBusinessId) {
    return `b:${classification.normalizedBusinessId}`;
  }

  if (classification.kind === "name" && classification.value) {
    return `n:${classification.value.toLowerCase()}`;
  }

  return undefined;
}

function getPageCacheKey(baseKey: string, page: number): string {
  return `${baseKey}:p:${page}`;
}

function isValidCacheEntry(entry: unknown): entry is SearchCacheEntry {
  if (!entry || typeof entry !== "object") {
    return false;
  }

  const maybe = entry as SearchCacheEntry;

  return (
    typeof maybe.timestampMs === "number" &&
    Number.isFinite(maybe.timestampMs) &&
    Array.isArray(maybe.companies) &&
    typeof maybe.totalResults === "number"
  );
}

function pruneCacheEntries(entries: [string, SearchCacheEntry][]): [string, SearchCacheEntry][] {
  const nowMs = Date.now();

  const retained = entries
    .filter(([, entry]) => nowMs - entry.timestampMs <= SEARCH_CACHE_RETENTION_MS)
    .sort((left, right) => right[1].timestampMs - left[1].timestampMs)
    .slice(0, SEARCH_CACHE_MAX_ENTRIES);

  return retained;
}

function mergeCompanies(existing: UiCompany[], incoming: UiCompany[]): UiCompany[] {
  if (!existing.length) {
    return incoming;
  }

  if (!incoming.length) {
    return existing;
  }

  const seen = new Set(existing.map((company) => company.businessId));
  const merged = [...existing];

  for (const company of incoming) {
    if (seen.has(company.businessId)) {
      continue;
    }

    seen.add(company.businessId);
    merged.push(company);
  }

  return merged;
}

function rankCompaniesForClassification(companies: UiCompany[], classification: QueryClassification): UiCompany[] {
  if (classification.kind !== "name" || !classification.value) {
    return companies;
  }

  return rankCompaniesForNameQuery(companies, classification.value);
}

function hydrateSearchCache(persistedCache: PersistedSearchCache): void {
  for (const [key, entry] of Object.entries(persistedCache)) {
    if (!isValidCacheEntry(entry)) {
      continue;
    }

    searchCache.set(key, entry);
  }

  const pruned = pruneCacheEntries([...searchCache.entries()]);
  searchCache.clear();
  for (const [key, entry] of pruned) {
    searchCache.set(key, entry);
  }
}

interface UsePrhSearchResult {
  searchText: string;
  setSearchText: (value: string) => void;
  classification: QueryClassification;
  companies: UiCompany[];
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  totalResults: number;
  hasMoreResults: boolean;
  page: number;
  loadNextPage: () => void;
  languageOrder: ("1" | "2" | "3")[];
}

export function usePrhSearch(): UsePrhSearchResult {
  const language = getLanguage();
  const [searchText, setSearchText] = useState("");
  const [companies, setCompanies] = useState<UiCompany[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const requestTokenRef = useRef(0);
  const hasHydratedCacheRef = useRef(false);
  const pendingLoadMoreRef = useRef(false);

  const {
    value: persistedCacheValue,
    setValue: setPersistedCacheValue,
    isLoading: isLoadingPersistedCache,
  } = useLocalStorage<PersistedSearchCache>(SEARCH_CACHE_STORAGE_KEY, {});
  const setPersistedCacheValueRef = useRef(setPersistedCacheValue);

  const classification = useMemo(() => classifyQuery(searchText, language), [searchText, language]);

  const languageOrder = useMemo(() => {
    const preferred = getPreferredLanguageCode(language);
    return getLanguageFallbackOrder(preferred);
  }, [language]);

  const cacheBaseKey = useMemo(() => getCacheBaseKey(classification), [classification]);

  useEffect(() => {
    setPersistedCacheValueRef.current = setPersistedCacheValue;
  }, [setPersistedCacheValue]);

  useEffect(() => {
    if (hasHydratedCacheRef.current || isLoadingPersistedCache) {
      return;
    }

    hydrateSearchCache(persistedCacheValue ?? {});
    hasHydratedCacheRef.current = true;
  }, [isLoadingPersistedCache, persistedCacheValue]);

  const persistSearchCache = useCallback(() => {
    const pruned = pruneCacheEntries([...searchCache.entries()]);

    searchCache.clear();
    const nextPersisted: PersistedSearchCache = {};

    for (const [key, entry] of pruned) {
      searchCache.set(key, entry);
      nextPersisted[key] = entry;
    }

    void setPersistedCacheValueRef.current(nextPersisted);
  }, []);

  const setCacheEntry = useCallback(
    (key: string, nextCompanies: UiCompany[], nextTotalResults: number) => {
      searchCache.set(key, {
        timestampMs: Date.now(),
        companies: nextCompanies,
        totalResults: nextTotalResults,
      });

      persistSearchCache();
    },
    [persistSearchCache],
  );

  useEffect(() => {
    requestTokenRef.current += 1;
    setPage(1);
    setCompanies([]);
    setTotalResults(0);
    setIsLoading(false);
    setIsRefreshing(false);
    setIsLoadingMore(false);
    pendingLoadMoreRef.current = false;
  }, [cacheBaseKey, languageOrder]);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (!cacheBaseKey) {
      return () => {
        controller.abort();
        if (timer) clearTimeout(timer);
      };
    }

    if (!hasHydratedCacheRef.current && isLoadingPersistedCache) {
      return () => {
        controller.abort();
        if (timer) clearTimeout(timer);
      };
    }

    const pageCacheKey = getPageCacheKey(cacheBaseKey, page);
    const nowMs = Date.now();
    const cached = searchCache.get(pageCacheKey);
    const cacheAgeMs = cached ? nowMs - cached.timestampMs : Number.POSITIVE_INFINITY;
    const hasFreshCache = Boolean(cached && cacheAgeMs <= SEARCH_CACHE_TTL_MS);

    if (cached) {
      // Cache entries contain raw PRH data; remap so changing language never keeps old labels.
      const rankedCachedCompanies = rankCompaniesForClassification(
        cached.companies.map((company) => toUiCompany(company.raw, languageOrder)),
        classification,
      );

      setTotalResults(cached.totalResults);

      if (page === 1) {
        setCompanies(rankedCachedCompanies);
        setIsLoading(false);
      } else {
        setCompanies((previous) =>
          rankCompaniesForClassification(mergeCompanies(previous, rankedCachedCompanies), classification),
        );
      }
    }

    if (hasFreshCache) {
      if (page === 1) {
        setIsRefreshing(false);
      } else {
        setIsLoadingMore(false);
        pendingLoadMoreRef.current = false;
      }

      return () => {
        controller.abort();
        if (timer) clearTimeout(timer);
      };
    }

    if (page === 1) {
      if (!cached) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
    } else {
      setIsLoadingMore(true);
    }

    const requestToken = ++requestTokenRef.current;

    const load = async () => {
      try {
        const response = await searchCompanies(
          {
            businessId: classification.kind === "businessId" ? classification.normalizedBusinessId : undefined,
            name: classification.kind === "name" ? classification.value : undefined,
            page,
            language,
          },
          controller.signal,
        );

        if (controller.signal.aborted || requestTokenRef.current !== requestToken) {
          return;
        }

        const mappedCompanies = rankCompaniesForClassification(
          response.companies.map((company) => toUiCompany(company, languageOrder)),
          classification,
        );

        if (page === 1) {
          setCompanies(mappedCompanies);
        } else {
          setCompanies((previous) =>
            rankCompaniesForClassification(mergeCompanies(previous, mappedCompanies), classification),
          );
        }

        setTotalResults(response.totalResults);
        setCacheEntry(pageCacheKey, mappedCompanies, response.totalResults);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }

        if (!cached && page === 1) {
          setCompanies([]);
          setTotalResults(0);
        }

        if (!cached && page > 1) {
          setPage((current) => (current === page ? page - 1 : current));
        }

        await showFailureToast(error, { title: translate("searchFailed", language) });
      } finally {
        if (!controller.signal.aborted && requestTokenRef.current === requestToken) {
          if (page === 1) {
            setIsLoading(false);
            setIsRefreshing(false);
          } else {
            setIsLoadingMore(false);
            pendingLoadMoreRef.current = false;
          }
        }
      }
    };

    if (classification.kind === "name" && page === 1) {
      timer = setTimeout(() => {
        void load();
      }, NAME_QUERY_DEBOUNCE_MS);
    } else {
      void load();
    }

    return () => {
      controller.abort();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [cacheBaseKey, classification, isLoadingPersistedCache, language, languageOrder, page, setCacheEntry]);

  const hasMoreResults = totalResults > companies.length;

  const loadNextPage = useCallback(() => {
    if (!cacheBaseKey || isLoading || isRefreshing || isLoadingMore || pendingLoadMoreRef.current || !hasMoreResults) {
      return;
    }

    pendingLoadMoreRef.current = true;
    setPage((current) => current + 1);
  }, [cacheBaseKey, hasMoreResults, isLoading, isLoadingMore, isRefreshing]);

  return {
    searchText,
    setSearchText,
    classification,
    companies,
    isLoading,
    isRefreshing,
    isLoadingMore,
    totalResults,
    hasMoreResults,
    page,
    loadNextPage,
    languageOrder,
  };
}
