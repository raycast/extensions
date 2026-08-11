import { useEffect } from "react";
import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { ApiResponse, FetchOptions } from "@/types";
import type { OmitData, WithData } from "@/types";
import { buildHeaders } from "@/utils/headers";

type PveFetchOptions<T> = FetchOptions<T> & {
  timerInterval?: number | null;
};

export const usePveFetch = <T>(url: string, options?: PveFetchOptions<T>) => {
  const { timerInterval = 1000, ...rest } = options ?? {};
  const preferences = getPreferenceValues<Preferences>();
  const fetchUrl = new URL(url, preferences.serverUrl).toString();
  const fetchOptions: FetchOptions<T> = {
    ...rest,
    headers: buildHeaders(),
    mapResult(result) {
      return { data: (result as ApiResponse<T>).data };
    },
  };

  const result = useFetch<T>(fetchUrl, fetchOptions);

  useEffect(() => {
    if (timerInterval === null) {
      return;
    }

    const handle = setInterval(() => {
      result.revalidate();
    }, timerInterval);

    return () => clearInterval(handle);
  }, [result.revalidate, timerInterval]);

  return result;
};

export type PveFetchResult<T> = ReturnType<typeof usePveFetch<T>>;
export type PveFetchWithDataResult<T> = OmitData<PveFetchResult<T>> & WithData<T>;
