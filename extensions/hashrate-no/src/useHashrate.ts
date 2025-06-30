import { getPreferenceValues } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { ErrorResponse } from "./types";

type useHashrateOptions = {
  params?: { [key: string]: string };
  initialData: Record<string, never> | [];
};
export function useHashrate<T>(endpoint: string, options: useHashrateOptions) {
  const API_URL = "https://api.hashrate.no/v1/";
  const { api_key } = getPreferenceValues<Preferences>();
  const PARAMS = new URLSearchParams({
    apiKey: api_key,
    ...options.params,
  });

  const { isLoading, data, revalidate } = useFetch(API_URL + endpoint + `?${PARAMS}`, {
    execute: false,
    mapResult(result: ErrorResponse | NonNullable<T>) {
      if (typeof result === "object") if ("title" in result) throw new Error(result.detail, { cause: result.title });

      return {
        data: result,
      };
    },
    async onError(error) {
      await showFailureToast(error.message, { title: String(error.cause) });
    },
    keepPreviousData: true,
    initialData: options.initialData,
  });

  return { isLoading, data, revalidate };
}
