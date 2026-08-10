import { useEffect } from "react";
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
 */
export const useMultiPveFetch = <T>(url: string, options?: MultiPveFetchOptions) => {
  const { timerInterval = 1000, execute = true } = options ?? {};
  const { servers, isLoading: isLoadingServers } = useServers();

  // Serialized so the promise re-executes exactly when the server list changes
  const serversKey = JSON.stringify(servers);

  const result = usePromise(
    async (key: string): Promise<PveServerResult<T>[]> => {
      const keyServers = JSON.parse(key) as PveServer[];
      return Promise.all(
        keyServers.map(async (server) => {
          try {
            const response = await pveFetch<T>(server, url);
            return { server, data: response.data };
          } catch (error) {
            return { server, error: describeFetchError(error) };
          }
        }),
      );
    },
    [serversKey],
    {
      execute: execute && !isLoadingServers,
    },
  );

  useEffect(() => {
    if (timerInterval === null || !execute) {
      return;
    }

    const handle = setInterval(() => {
      result.revalidate();
    }, timerInterval);

    return () => clearInterval(handle);
  }, [result.revalidate, timerInterval, execute]);

  return {
    ...result,
    servers,
    isLoading: isLoadingServers || result.isLoading,
  };
};

export type MultiPveFetchResult<T> = ReturnType<typeof useMultiPveFetch<T>>;
