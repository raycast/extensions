import { getPreferenceValues } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { parseSpaceConfigs } from "../api/contentful-client";
import {
  fetchAllContentTypes,
  fetchLatestEntries,
  searchEntries,
} from "../api/contentful-service";
import type {
  ContentfulEntry,
  ContentTypeInfo,
  SpaceConfig,
} from "../types/contentful";

type Preferences = {
  spaces: string;
};

type UseContentfulSearchResult = {
  entries: ContentfulEntry[];
  isLoading: boolean;
  error?: Error;
  spaceConfigs?: SpaceConfig[];
  contentTypes: ContentTypeInfo[];
  isLoadingContentTypes: boolean;
};

/**
 * Custom hook for searching Contentful entries with debouncing and filtering
 * Also fetches latest entries when no query is provided
 * @param query - Search query string
 * @param contentTypeFilter - Content type ID to filter by (or "all" for no filter)
 * @param debounceMs - Debounce delay in milliseconds (default: 300)
 * @returns Search result with entries, content types, loading states, and error
 */
export function useContentfulSearch(
  query: string,
  contentTypeFilter = "all",
  debounceMs = 300
): UseContentfulSearchResult {
  const [entries, setEntries] = useState<ContentfulEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | undefined>();
  const [spaceConfigs, setSpaceConfigs] = useState<SpaceConfig[] | undefined>();
  const [contentTypes, setContentTypes] = useState<ContentTypeInfo[]>([]);
  const [isLoadingContentTypes, setIsLoadingContentTypes] =
    useState<boolean>(true);

  // Parse space configurations and fetch latest entries + content types on mount
  useEffect(() => {
    const initializeAndFetchLatest = async () => {
      try {
        const preferences = getPreferenceValues<Preferences>();
        const configs = parseSpaceConfigs(preferences.spaces);
        setSpaceConfigs(configs);

        // Fetch latest entries and content types in parallel
        setIsLoading(true);
        setIsLoadingContentTypes(true);

        const [latestEntries, allContentTypes] = await Promise.all([
          fetchLatestEntries(configs, 10),
          fetchAllContentTypes(configs),
        ]);

        setEntries(latestEntries);
        setContentTypes(allContentTypes);
        setIsLoading(false);
        setIsLoadingContentTypes(false);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to parse space configurations")
        );
        setIsLoading(false);
        setIsLoadingContentTypes(false);
      }
    };

    initializeAndFetchLatest();
  }, []);

  // Debounced search effect
  useEffect(() => {
    // Don't search if no space configs
    if (!spaceConfigs) {
      return;
    }

    // If query is empty, show latest entries (with content type filter if applied)
    if (query.trim().length === 0) {
      setIsLoading(true);
      fetchLatestEntries(spaceConfigs, 10, contentTypeFilter)
        .then((results) => {
          setEntries(results);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to fetch latest entries")
          );
          setIsLoading(false);
        });
      return;
    }

    // Don't search if query is too short
    if (query.trim().length < 2) {
      return;
    }

    setIsLoading(true);
    setError(undefined);

    const timeoutId = setTimeout(() => {
      searchEntries(spaceConfigs, query)
        .then((results) => {
          setEntries(results);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err : new Error("Search failed"));
          setEntries([]);
          setIsLoading(false);
        });
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query, spaceConfigs, debounceMs, contentTypeFilter]);

  // When searching, filter entries by content type
  // When not searching (showing latest), entries are already filtered by content type from the API
  const filteredEntries = useMemo(() => {
    // If query is empty, entries are already filtered by content type from fetchLatestEntries
    if (query.trim().length === 0) {
      return entries;
    }
    // If query exists, filter search results by content type
    if (contentTypeFilter === "all") {
      return entries;
    }
    return entries.filter((entry) => entry.contentTypeId === contentTypeFilter);
  }, [entries, contentTypeFilter, query]);

  return {
    entries: filteredEntries,
    isLoading,
    error,
    spaceConfigs,
    contentTypes,
    isLoadingContentTypes,
  };
}
