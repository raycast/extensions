import { showFailureToast, useFetch } from "@raycast/utils";
import { API_HEADERS } from "./config";
import { generateCoolifyUrl, parseCoolifyResponse } from "./utils";

type UseCoolify<T> = {
  method: string;
  body?: Record<string, string | boolean>;
  execute: boolean;
  onError?: () => void;
  onData?: (data: T) => void;
};
export default function useCoolify<T>(
  endpoint: string,
  { method, body, execute, onData, onError }: UseCoolify<T> = { method: "GET", execute: true },
) {
  const url = generateCoolifyUrl("api/v1/");
  const { isLoading, data, revalidate } = useFetch<T>(url + endpoint, {
    method,
    headers: API_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
    execute,
    onData,
    parseResponse: parseCoolifyResponse,
    async onError(error) {
      await showFailureToast(error);
      onError?.();
    },
  });
  return { isLoading, data, revalidate };
}
