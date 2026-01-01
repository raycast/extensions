/**
 * React hook for fetching and managing marketplace data
 */

import { useState, useEffect, useCallback } from "react";
import { getMarketplaces } from "../lib/claude-cli";
import {
  getCachedData,
  CACHE_KEYS,
  invalidateCache,
} from "../lib/cache-manager";
import { Marketplace } from "../lib/types";

export function useMarketplaces() {
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMarketplaces = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getCachedData(
        CACHE_KEYS.MARKETPLACES,
        getMarketplaces,
      );
      setMarketplaces(data);
    } catch (err) {
      setError(err as Error);
      setMarketplaces([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketplaces();
  }, [fetchMarketplaces]);

  const refetch = useCallback(() => {
    invalidateCache(CACHE_KEYS.MARKETPLACES);
    fetchMarketplaces();
  }, [fetchMarketplaces]);

  return { marketplaces, isLoading, error, refetch };
}
