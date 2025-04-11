import { showFailureToast, useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL } from "../constants";
import { ErrorResponse } from "../types";

type useVultrOptions = {
  body?: { [key: string]: string | boolean | string[] };
  method: "GET" | "POST" | "PATCH" | "DEL";
  execute?: boolean;
  onData?: () => void;
  onError?: () => void;
};
export default function useVultr<T>(endpoint: string, options: useVultrOptions = { method: "GET" }) {
  const { method } = options;
  const execute = options.execute || method === "GET";

  const { isLoading, data, revalidate } = useFetch(API_URL + endpoint, {
    headers: API_HEADERS,
    method,
    body: options.body ? JSON.stringify(options.body) : undefined,
    execute,
    async parseResponse(response) {
      if (!response.ok) {
        const result = (await response.json()) as ErrorResponse;
        throw new Error(result.error, { cause: result.status });
      }
      if (response.status === 204) return {} as T;
      const result = (await response.json()) as T;
      return result;
    },
    async onError(error) {
      await showFailureToast(error.message, { title: `${error.cause} Error` });
      options.onError?.();
    },
    onData() {
      options.onData?.();
    },
  });

  return { isLoading, data, revalidate };
}
