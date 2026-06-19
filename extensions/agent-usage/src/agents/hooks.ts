import { useState, useEffect, useCallback, useRef } from "react";
import type { UsageState } from "./types";

type Preferences = Preferences.AgentUsage;

/**
 * Factory for token-based hooks (droid, kimi, zai).
 * Reads the token from preferences, shows "not_configured" if missing.
 */
export function createTokenBasedHook<TUsage, TError extends { type: string; message: string }>(options: {
  preferenceKey: keyof Preferences;
  agentName: string;
  fetcher: (token: string) => Promise<{ usage: TUsage | null; error: TError | null }>;
}): (enabled?: boolean) => UsageState<TUsage, TError> {
  const { preferenceKey, agentName, fetcher } = options;

  return function useTokenBasedHook(enabled = true) {
    const [usage, setUsage] = useState<TUsage | null>(null);
    const [error, setError] = useState<TError | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);
    const requestIdRef = useRef(0);

    const fetchData = useCallback(async () => {
      const requestId = ++requestIdRef.current;

      // Lazy import to avoid loading @raycast/api at module level (keeps tests working)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPreferenceValues } = require("@raycast/api") as typeof import("@raycast/api");
      const preferences = getPreferenceValues<Preferences>();
      const token = (preferences[preferenceKey] as string)?.trim() || "";

      if (!token) {
        setUsage(null);
        setError({
          type: "not_configured",
          message: `${agentName} token not configured. Please add it in extension settings (Cmd+,).`,
        } as TError);
        setIsLoading(false);
        setHasInitialFetch(true);
        return;
      }

      setIsLoading(true);
      setError(null);

      const result = await fetcher(token);
      if (requestId !== requestIdRef.current) {
        return;
      }

      setUsage(result.usage);
      setError(result.error);
      setIsLoading(false);
      setHasInitialFetch(true);
      // preferenceKey, agentName, fetcher are stable factory-closure values — no deps needed
    }, []);

    useEffect(() => {
      if (!enabled) {
        requestIdRef.current += 1;
        setUsage(null);
        setError(null);
        setIsLoading(false);
        setHasInitialFetch(false);
        return;
      }

      if (!hasInitialFetch) {
        void fetchData();
      }
    }, [enabled, hasInitialFetch, fetchData]);

    const revalidate = useCallback(async () => {
      if (!enabled) {
        return;
      }

      await fetchData();
    }, [enabled, fetchData]);

    return {
      isLoading: enabled ? isLoading : false,
      usage: enabled ? usage : null,
      error: enabled ? error : null,
      revalidate,
    };
  };
}

/**
 * Factory for no-token hooks (gemini, antigravity).
 */
export function createSimpleHook<TUsage, TError>(options: {
  fetcher: () => Promise<{ usage: TUsage | null; error: TError | null }>;
}): (enabled?: boolean) => UsageState<TUsage, TError> {
  const { fetcher } = options;

  return function useSimpleHook(enabled = true) {
    const [usage, setUsage] = useState<TUsage | null>(null);
    const [error, setError] = useState<TError | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);
    const requestIdRef = useRef(0);

    const fetchData = useCallback(async () => {
      const requestId = ++requestIdRef.current;

      setIsLoading(true);
      setError(null);

      const result = await fetcher();
      if (requestId !== requestIdRef.current) {
        return;
      }

      setUsage(result.usage);
      setError(result.error);
      setIsLoading(false);
      setHasInitialFetch(true);
      // fetcher is a stable factory-closure value — no deps needed
    }, []);

    useEffect(() => {
      if (!enabled) {
        requestIdRef.current += 1;
        setUsage(null);
        setError(null);
        setIsLoading(false);
        setHasInitialFetch(false);
        return;
      }

      if (!hasInitialFetch) {
        void fetchData();
      }
    }, [enabled, hasInitialFetch, fetchData]);

    const revalidate = useCallback(async () => {
      if (!enabled) {
        return;
      }

      await fetchData();
    }, [enabled, fetchData]);

    return {
      isLoading: enabled ? isLoading : false,
      usage: enabled ? usage : null,
      error: enabled ? error : null,
      revalidate,
    };
  };
}
