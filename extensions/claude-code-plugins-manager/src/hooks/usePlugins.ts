/**
 * React hook for fetching and managing plugin data
 */

import { useState, useEffect, useCallback } from "react";
import { getAllAvailablePlugins } from "../lib/claude-cli";
import {
  getCachedData,
  CACHE_KEYS,
  invalidateCache,
} from "../lib/cache-manager";
import { Plugin } from "../lib/types";

export function usePlugins() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlugins = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getCachedData(
        CACHE_KEYS.ALL_PLUGINS,
        getAllAvailablePlugins,
      );
      setPlugins(data);
    } catch (err) {
      setError(err as Error);
      setPlugins([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const refetch = useCallback(() => {
    invalidateCache(CACHE_KEYS.ALL_PLUGINS);
    fetchPlugins();
  }, [fetchPlugins]);

  return { plugins, isLoading, error, refetch };
}
