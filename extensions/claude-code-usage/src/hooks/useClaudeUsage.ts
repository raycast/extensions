import { useCallback, useEffect, useState } from "react";
import { fetchUsage } from "../services/anthropic";
import {
  getCachedAuthState,
  getCachedUsage,
  setCachedUsage,
  subscribeToUsageCache,
} from "../services/cache";
import { getStoredTokens } from "../services/oauth";
import { Usage } from "../types";

export type ClaudeUsageState = {
  data: Usage | null;
  isLoading: boolean;
  hasTokens: boolean | null;
  lastError: string | null;
  refresh: () => Promise<boolean>;
};

export function useClaudeUsage(shouldFetch = true): ClaudeUsageState {
  const [data, setData] = useState<Usage | null>(() => getCachedUsage());
  const [hasTokens, setHasTokens] = useState<boolean | null>(() => {
    const cachedAuth = getCachedAuthState();
    if (cachedAuth === "authenticated") return true;
    if (cachedAuth === "unauthenticated") return false;
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const hasCachedData = Boolean(getCachedUsage());
    return !hasCachedData && shouldFetch;
  });
  const [lastError, setLastError] = useState<string | null>(null);

  // Sync with cache changes triggered by other commands
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = subscribeToUsageCache(() => {
      if (!isMounted) return;

      const cached = getCachedUsage();
      setData(cached);

      const authState = getCachedAuthState();
      if (authState === "authenticated") {
        setHasTokens(true);
      } else if (authState === "unauthenticated") {
        setHasTokens(false);
      } else if (cached) {
        setHasTokens(true);
      }

      void getStoredTokens().then((tokens) => {
        if (isMounted) {
          setHasTokens(Boolean(tokens));
        }
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setLastError(null);

    try {
      const tokens = await getStoredTokens();
      const tokenExists = Boolean(tokens);
      setHasTokens(tokenExists);

      if (!tokenExists) {
        return false;
      }

      const result = await fetchUsage();
      if (result.success) {
        setCachedUsage(result.usage);
        setData(result.usage);
        return true;
      }

      if (result.errorType === "unauthorized") {
        setHasTokens(false);
        setLastError("Session expired. Please sign in again.");
      } else if (result.errorType === "rate_limit") {
        setLastError(
          "Rate limited by Anthropic API. Showing cached data if available.",
        );
      } else {
        setLastError("Failed to fetch latest usage from Anthropic.");
      }

      return false;
    } catch {
      setLastError("Failed to fetch latest usage from Anthropic.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        const tokens = await getStoredTokens();
        if (!isMounted) return;

        const tokenExists = Boolean(tokens);
        setHasTokens(tokenExists);

        if (!tokenExists) {
          return;
        }

        if (shouldFetch) {
          const result = await fetchUsage();
          if (!isMounted) return;

          if (result.success) {
            setCachedUsage(result.usage);
            setData(result.usage);
          } else if (result.errorType === "unauthorized") {
            setHasTokens(false);
            setLastError("Session expired. Please sign in again.");
          } else if (result.errorType === "rate_limit") {
            setLastError("Rate limited by Anthropic API.");
          } else {
            setLastError("Unable to update usage. Using cached data.");
          }
        }
      } catch {
        if (isMounted) {
          setLastError("Unable to update usage. Using cached data.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      isMounted = false;
    };
  }, [shouldFetch]);

  return { data, isLoading, hasTokens, lastError, refresh };
}
