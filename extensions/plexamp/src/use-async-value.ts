import { Cache } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";

const cache = new Cache();

function readCache<T>(key: string): T | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function writeCache<T>(key: string, value: T): void {
  try {
    cache.set(key, JSON.stringify(value));
  } catch {
    // Cache write failures are non-critical
  }
}

interface AsyncValueState<T> {
  isLoading: boolean;
  value: T;
  error?: string;
}

export function useAsyncValue<T>(loader: () => Promise<T>, dependencyKey: string, initialValue: T, cacheKey?: string) {
  const cached = cacheKey ? readCache<T>(cacheKey) : undefined;

  const [state, setState] = useState<AsyncValueState<T>>({
    isLoading: true,
    value: cached ?? initialValue,
  });
  const loaderRef = useRef(loader);
  const initialValueRef = useRef(initialValue);
  const cacheKeyRef = useRef(cacheKey);
  const requestIdRef = useRef(0);

  loaderRef.current = loader;
  initialValueRef.current = initialValue;
  cacheKeyRef.current = cacheKey;

  const reload = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const currentCacheKey = cacheKeyRef.current;

    // When we have cached data, keep showing it (don't reset to initialValue)
    setState((prev) => ({
      isLoading: true,
      value:
        prev.value === initialValueRef.current && currentCacheKey
          ? (readCache<T>(currentCacheKey) ?? prev.value)
          : prev.value,
      error: undefined,
    }));

    try {
      const value = await loaderRef.current();

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (currentCacheKey) {
        writeCache(currentCacheKey, value);
      }

      setState({
        isLoading: false,
        value,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      // On error, keep cached data if available instead of falling back to empty
      const fallback = currentCacheKey
        ? (readCache<T>(currentCacheKey) ?? initialValueRef.current)
        : initialValueRef.current;

      setState({
        isLoading: false,
        value: fallback,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  useEffect(() => {
    void reload();

    return () => {
      requestIdRef.current += 1;
    };
  }, [dependencyKey, reload]);

  return {
    ...state,
    reload,
  };
}
