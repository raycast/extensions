import { useCallback, useEffect, useRef, useState } from "react";

export interface QueryPage<T> {
  items: T[];
  hasMore: boolean;
}

interface QueryState<T> {
  key: string;
  items: T[];
  error?: unknown;
  isLoading: boolean;
  hasMore: boolean;
  nextOffset: number;
}

export function usePaginatedQuery<T>(
  key: string,
  loader: (offset: number, limit: number) => Promise<QueryPage<T>>,
  enabled = true,
  pageSize = 200
) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const generationRef = useRef(0);
  const loadingRef = useRef(false);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<QueryState<T>>({
    key,
    items: [],
    isLoading: enabled,
    hasMore: false,
    nextOffset: 0,
  });

  const load = useCallback(
    async (offset: number, reset: boolean, generation: number) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setState((current) => ({
        key,
        items: reset || current.key !== key ? [] : current.items,
        isLoading: true,
        hasMore: reset || current.key !== key ? false : current.hasMore,
        nextOffset: reset || current.key !== key ? 0 : current.nextOffset,
      }));
      try {
        const page = await loaderRef.current(offset, pageSize);
        if (generation !== generationRef.current) return;
        setState((current) => {
          const items = reset || current.key !== key ? page.items : [...current.items, ...page.items];
          return {
            key,
            items,
            isLoading: false,
            hasMore: page.hasMore && page.items.length > 0,
            nextOffset: offset + page.items.length,
          };
        });
      } catch (error) {
        if (generation === generationRef.current) {
          setState({ key, items: [], error, isLoading: false, hasMore: false, nextOffset: 0 });
        }
      } finally {
        if (generation === generationRef.current) loadingRef.current = false;
      }
    },
    [key, pageSize]
  );

  useEffect(() => {
    generationRef.current += 1;
    loadingRef.current = false;
    const generation = generationRef.current;
    if (!enabled) {
      setState({ key, items: [], isLoading: false, hasMore: false, nextOffset: 0 });
      return;
    }
    void load(0, true, generation);
    return () => {
      if (generation === generationRef.current) generationRef.current += 1;
    };
  }, [key, revision, enabled, load]);

  const current = state.key === key ? state : { key, items: [], isLoading: enabled, hasMore: false, nextOffset: 0 };
  return {
    data: current.items,
    error: current.error,
    isLoading: current.isLoading,
    pagination: {
      pageSize,
      hasMore: current.hasMore,
      onLoadMore: () => {
        if (!current.isLoading && current.hasMore) void load(current.nextOffset, false, generationRef.current);
      },
    },
    revalidate: () => setRevision((value) => value + 1),
  };
}
