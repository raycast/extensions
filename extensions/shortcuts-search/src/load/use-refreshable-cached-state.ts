import { useCachedState, usePromise } from "@raycast/utils";

const ttlMillis = 3600_000;

interface CachedItem<T> {
  data: T | undefined;
  lastUpdateTs: number;
}

interface UseRefreshableCachedStateResult<U> {
  isLoading: boolean;
  data: U;
  revalidate: () => void;
}

export function useRefreshableCachedState<T, U>(
  key: string,
  dataSupplier: () => Promise<T>,
  options: {
    dataParser: (arg: T | undefined) => U;
    execute?: boolean;
  }
): UseRefreshableCachedStateResult<U> {
  const [state, setState] = useCachedState<CachedItem<T>>(key, { data: undefined, lastUpdateTs: 0 });
  const { revalidate } = usePromise(dataSupplier, [], {
    execute: !isFresh() && (options?.execute ?? true),
    onData: (data) => {
      const newCachedItem: CachedItem<T> = {
        lastUpdateTs: Date.now(),
        data,
      };
      setState(newCachedItem);
    },
  });

  function isFresh() {
    return state.lastUpdateTs + ttlMillis > Date.now();
  }

  return {
    isLoading: !state.data,
    data: options.dataParser(state.data),
    revalidate,
  };
}
