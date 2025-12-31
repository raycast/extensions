import { useState, useCallback, useEffect, useRef } from "react";
import { UsageLimitData } from "../types/usage-types";
import { getClaudeAccessToken } from "../utils/keychain-access";
import { fetchClaudeUsageLimits } from "../utils/claude-api-client";

export interface UsageLimitsState {
  data: UsageLimitData | null;
  isLoading: boolean;
  error: Error | null;
  isStale: boolean;
  lastFetched: Date | null;
  revalidate: () => void;
}

export const useClaudeUsageLimits = (): UsageLimitsState => {
  const [data, setData] = useState<UsageLimitData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const cacheRef = useRef<UsageLimitData | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = await getClaudeAccessToken();

      if (!token) {
        const err = new Error("Claude Code credentials not found in keychain");
        setError(err);
        if (cacheRef.current) {
          setData(cacheRef.current);
          setIsStale(true);
        } else {
          setData(null);
          setIsStale(false);
        }
        setIsLoading(false);
        return;
      }

      const limitData = await fetchClaudeUsageLimits(token);

      if (limitData) {
        setData(limitData);
        cacheRef.current = limitData;
        setIsStale(false);
        setError(null);
        setLastFetched(new Date());
      } else {
        const err = new Error("Failed to fetch usage limits from API");
        setError(err);
        if (cacheRef.current) {
          setData(cacheRef.current);
          setIsStale(true);
        } else {
          setData(null);
          setIsStale(false);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred");
      setError(error);
      if (cacheRef.current) {
        setData(cacheRef.current);
        setIsStale(true);
      } else {
        setData(null);
        setIsStale(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const revalidate = useCallback(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    isStale,
    lastFetched,
    revalidate,
  };
};
