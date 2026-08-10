import { useEffect } from "react";
import { useFetch } from "@raycast/utils";
import type { ApiResponse, FetchOptions, PveServer } from "@/types";
import type { OmitData, WithData } from "@/types";
import { buildHeaders } from "@/utils/headers";

type PveFetchOptions<T> = FetchOptions<T> & {
  timerInterval?: number | null;
};

export const usePveFetch = <T>(server: PveServer, url: string, options?: PveFetchOptions<T>) => {
  const { timerInterval = 1000, ...rest } = options ?? {};
  const fetchUrl = new URL(url, server.url).toString();
  const fetchOptions: FetchOptions<T> = {
    ...rest,
    headers: buildHeaders(server),
    mapResult(result) {
      return { data: (result as ApiResponse<T>).data };
    },
  };

  const result = useFetch<T>(fetchUrl, fetchOptions);

  const execute = rest.execute !== false;
  useEffect(() => {
    if (timerInterval === null || !execute) {
      return;
    }

    const handle = setInterval(() => {
      result.revalidate();
    }, timerInterval);

    return () => clearInterval(handle);
  }, [result.revalidate, timerInterval, execute]);

  return result;
};

export type PveFetchResult<T> = ReturnType<typeof usePveFetch<T>>;
export type PveFetchWithDataResult<T> = OmitData<PveFetchResult<T>> & WithData<T>;
