import { useEffect, useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import type { PveServer } from "@/types";
import type { OmitData, WithData } from "@/types";
import { pveFetch } from "@/api";

type PveFetchOptions<T> = {
  /** Set to false to skip fetching, e.g. while the data isn't needed yet */
  execute?: boolean;
  /** Called when a request fails, e.g. to show a toast and an error screen */
  onError?: (error: Error) => void | Promise<void>;
  onData?: (data: T) => void | Promise<void>;
  /** How often to revalidate in milliseconds, `null` to never poll */
  timerInterval?: number | null;
};

export const usePveFetch = <T>(server: PveServer, url: string, options?: PveFetchOptions<T>) => {
  const { timerInterval = 1000, ...rest } = options ?? {};
  const abortable = useRef<AbortController>(null);

  // Fetching through pveFetch() bounds every request in time and stays
  // cache-backed, so the last successful data renders again on a cold start.
  const result = useCachedPromise(
    async (server: PveServer, url: string): Promise<T> =>
      (await pveFetch<T>(server, url, { signal: abortable.current?.signal })).data,
    [server, url],
    { ...rest, abortable },
  );

  const execute = rest.execute !== false;
  useEffect(() => {
    if (timerInterval === null || !execute) {
      return;
    }

    const handle = setInterval(() => {
      // revalidate() aborts the request that is still in flight, so ticking
      // while the server is slower than the interval would abort every request
      // before it can resolve and the data would never refresh.
      if (!result.isLoading) {
        result.revalidate();
      }
    }, timerInterval);

    return () => clearInterval(handle);
  }, [result.revalidate, result.isLoading, timerInterval, execute]);

  return result;
};

export type PveFetchResult<T> = ReturnType<typeof usePveFetch<T>>;
export type PveFetchWithDataResult<T> = OmitData<PveFetchResult<T>> & WithData<T>;
