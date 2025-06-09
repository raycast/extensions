import { useState, useRef, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { BaseTorrent } from "../types/torrent.types";
import { API_ENDPOINTS } from "../constants/api.constants";

interface UseTorrentSearchResult {
  torrents: BaseTorrent[];
  isLoading: boolean;
  searchTorrents: (query: string) => Promise<void>;
  clearResults: () => void;
}

// Simple in-memory cache for search results
const searchCache = new Map<string, { data: BaseTorrent[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useTorrentSearch = (): UseTorrentSearchResult => {
  const [torrents, setTorrents] = useState<BaseTorrent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearResults = useCallback(() => {
    setTorrents([]);
  }, []);

  const searchTorrents = useCallback(
    async (query: string): Promise<void> => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (!query || typeof query !== "string" || !query.trim()) {
        clearResults();
        return;
      }

      // Check cache first
      const cacheKey = String(query).toLowerCase().trim();
      const cached = searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setTorrents(cached.data);
        return;
      }

      setIsLoading(true);
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(API_ENDPOINTS.search(query), {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch torrents`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          // Cache the results
          searchCache.set(cacheKey, { data, timestamp: Date.now() });
          setTorrents(data);
        } else {
          setTorrents([]);
          showToast(Toast.Style.Failure, "Invalid response format");
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // Request was cancelled, don't show error
          return;
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        showToast(Toast.Style.Failure, "Search failed", errorMessage);
        setTorrents([]);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [clearResults],
  );

  return { torrents, isLoading, searchTorrents, clearResults };
};
