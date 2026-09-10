import { useEffect, useRef } from "react";
import { usePromise } from "@raycast/utils";
import type { PveServer, PveServerResult } from "@/types";
import { pveFetch } from "@/api";
import { describeFetchError } from "@/utils/errors";
import { useServers } from "@/utils/servers";

type MultiPveFetchOptions = {
  timerInterval?: number | null;
  execute?: boolean;
};

/**
 * Fetch the same resource from every configured server.
 *
 * Failures are captured per server, so one unreachable server
 * doesn't prevent showing the results of the others.
 *
 * Every tick fetches all servers as one batch, so while a server hangs the
 * healthy ones refresh at that server's request timeout instead of at
 * `timerInterval`. Splitting the batch per server would keep them on their own
 * cadence, but also cost one re-render and one cache write per server per tick.
 */
export const useMultiPveFetch = <T>(url: string, options?: MultiPveFetchOptions) => {
  const { timerInterval = 1000, execute = true } = options ?? {};
  const { servers, isLoading: isLoadingServers } = useServers();
  const abortable = useRef<AbortController>(null);

  const result = usePromise(
    async (url: string, servers: PveServer[]): Promise<PveServerResult<T>[]> =>
      Promise.all(
        servers.map(async (server) => {
          try {
            const response = await pveFetch<T>(server, url, { signal: abortable.current?.signal });
            return { server, data: response.data };
          } catch (error) {
            // Let an aborted request reject the whole call, usePromise ignores it.
            // Keeping it would show a stale request as a connection error.
            if (error instanceof Error && error.name === "AbortError") {
              throw error;
            }

            return { server, error: describeFetchError(error) };
          }
        }),
      ),
    [url, servers],
    {
      abortable,
      execute: execute && !isLoadingServers,
    },
  );

  useEffect(() => {
    if (timerInterval === null || !execute) {
      return;
    }

    const handle = setInterval(() => {
      // revalidate() aborts the request that is still in flight, so ticking
      // while a server is slower than the interval would abort every request
      // before it can resolve and the list would never leave the loading state.
      if (!result.isLoading) {
        result.revalidate();
      }
    }, timerInterval);

    return () => clearInterval(handle);
  }, [result.revalidate, result.isLoading, timerInterval, execute]);

  return {
    ...result,
    servers,
    isLoading: isLoadingServers || result.isLoading,
  };
};

export type MultiPveFetchResult<T> = ReturnType<typeof useMultiPveFetch<T>>;
