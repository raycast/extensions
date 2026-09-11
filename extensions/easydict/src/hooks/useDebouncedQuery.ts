/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * Wraps a queryText function with input debounce.
 *
 * Cleanup: clears the timer on unmount to prevent stale queries.
 */
export function useDebouncedQuery(queryText: (text: string, toLanguage: string) => void, delay = 600) {
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const debouncedQuery = useMemo(() => {
    const fn = (text: string, toLanguage: string) => {
      cancel();
      timerRef.current = setTimeout(() => {
        queryText(text, toLanguage);
      }, delay);
    };
    fn.cancel = cancel;
    return fn;
  }, [queryText, delay, cancel]);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return debouncedQuery;
}
