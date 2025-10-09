/**
 * useDebounce hook for debouncing values and functions
 * Optimizes performance by limiting how often expensive operations are triggered
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export interface DebounceOptions {
  leading?: boolean; // Call on the leading edge
  trailing?: boolean; // Call on the trailing edge (default: true)
  maxWait?: number; // Maximum time to wait before invoking
}

/**
 * Debounce a value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Advanced debounce hook with more options
 */
export function useDebouncedValue<T>(value: T, delay: number, options: DebounceOptions = {}): [T, boolean] {
  const { leading = false, trailing = true } = options;
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isPending, setIsPending] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const leadingRef = useRef<boolean>(true);

  useEffect(() => {
    const callNow = leading && leadingRef.current;

    if (callNow) {
      setDebouncedValue(value);
      leadingRef.current = false;
      setIsPending(false);
    } else {
      setIsPending(true);
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (trailing && !callNow) {
        setDebouncedValue(value);
      }
      leadingRef.current = true;
      setIsPending(false);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, leading, trailing]);

  return [debouncedValue, isPending];
}

/**
 * Debounce a callback function
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
  options: DebounceOptions = {},
): [T, () => void] {
  const { leading = false, trailing = true, maxWait } = options;
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxTimeoutRef = useRef<NodeJS.Timeout>();
  const leadingRef = useRef<boolean>(true);
  const argsRef = useRef<Parameters<T>>();

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      argsRef.current = args;

      const callNow = leading && leadingRef.current;

      if (callNow) {
        callbackRef.current(...args);
        leadingRef.current = false;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (trailing && !callNow && argsRef.current) {
          callbackRef.current(...argsRef.current);
        }
        leadingRef.current = true;
        if (maxTimeoutRef.current) {
          clearTimeout(maxTimeoutRef.current);
        }
      }, delay);

      // Handle maxWait option
      if (maxWait && !maxTimeoutRef.current) {
        maxTimeoutRef.current = setTimeout(() => {
          if (argsRef.current) {
            callbackRef.current(...argsRef.current);
          }
          leadingRef.current = true;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          maxTimeoutRef.current = undefined;
        }, maxWait);
      }
    },
    [delay, leading, trailing, maxWait],
  ) as T;

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = undefined;
    }
    leadingRef.current = true;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return [debouncedFn, cancel];
}

/**
 * Hook for debounced search functionality
 */
export function useDebouncedSearch(
  initialQuery: string = "",
  delay: number = 300,
): {
  query: string;
  debouncedQuery: string;
  setQuery: (query: string) => void;
  isSearching: boolean;
  clearQuery: () => void;
} {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, isSearching] = useDebouncedValue(query, delay);

  const clearQuery = useCallback(() => {
    setQuery("");
  }, []);

  return {
    query,
    debouncedQuery,
    setQuery,
    isSearching,
    clearQuery,
  };
}

/**
 * Hook for debounced API calls
 */
export function useDebouncedApi<T, Args extends unknown[]>(
  apiCall: (...args: Args) => Promise<T>,
  delay: number = 500,
  dependencies: Args,
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController>();

  const debouncedCall = useMemo(() => {
    return debounce(async (...args) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setLoading(true);
      setError(null);

      try {
        const result = await apiCall(...(args as unknown as Args));
        setData(result);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    }, delay);
  }, [apiCall, delay]);

  useEffect(() => {
    if (dependencies.some((dep) => dep !== undefined && dep !== null && dep !== "")) {
      debouncedCall(...dependencies);
    } else {
      setData(null);
      setError(null);
    }

    return () => {
      debouncedCall.cancel();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, dependencies);

  const retry = useCallback(() => {
    debouncedCall(...dependencies);
  }, [debouncedCall, dependencies]);

  return { data, loading, error, retry };
}

/**
 * Simple debounce function utility
 */
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
  options: DebounceOptions = {},
): T & { cancel: () => void } {
  const { leading = false, trailing = true, maxWait } = options;
  let timeoutId: NodeJS.Timeout | undefined;
  let maxTimeoutId: NodeJS.Timeout | undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let leadingCalled = false; // Used in timeout functions below
  let lastCallTime: number | undefined;
  let lastArgs: Parameters<T> | undefined;

  function invokeFunc(args: Parameters<T>) {
    lastArgs = undefined;
    return func(...args);
  }

  function shouldInvoke(time: number) {
    if (lastCallTime === undefined) return true;
    if (maxWait !== undefined && time - lastCallTime >= maxWait) return true;
    return false;
  }

  function debouncedFunc(...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    lastArgs = args;
    lastCallTime = time;

    if (isInvoking && timeoutId === undefined && leading) {
      leadingCalled = true;
      return invokeFunc(args);
    }

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      leadingCalled = false;
      if (trailing && lastArgs) {
        invokeFunc(lastArgs);
      }
      if (maxTimeoutId !== undefined) {
        clearTimeout(maxTimeoutId);
        maxTimeoutId = undefined;
      }
    }, wait);

    if (maxWait !== undefined && maxTimeoutId === undefined) {
      maxTimeoutId = setTimeout(() => {
        if (lastArgs) {
          invokeFunc(lastArgs);
        }
        leadingCalled = false;
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        maxTimeoutId = undefined;
      }, maxWait);
    }
  }

  debouncedFunc.cancel = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    if (maxTimeoutId !== undefined) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = undefined;
    }
    leadingCalled = false;
    lastCallTime = undefined;
    lastArgs = undefined;
  };

  return debouncedFunc as T & { cancel: () => void };
}
