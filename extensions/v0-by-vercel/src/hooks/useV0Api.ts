import { useFetch } from "@raycast/utils";
import { parseV0ApiResponseBody } from "../lib/v0-api-utils";

interface Options<T> extends Omit<RequestInit, "body"> {
  body?: Record<string, unknown> | string;
  execute?: boolean;
  onError?: (error: Error) => void;
  onData?: (data: T) => void;
  initialData?: T;
  keepPreviousData?: boolean;
  parseResponse?: (response: Response) => Promise<T>;
}

export function useV0Api<T>(url: string, options?: Options<T>) {
  const { body, initialData, ...restOptions } = options || {};

  const fetchOptions: RequestInit = {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Raycast-v0-Extension",
      ...(restOptions?.headers || {}),
    },
    body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  };

  return useFetch<T, T, T>(url, {
    ...fetchOptions,
    initialData,
    parseResponse:
      (restOptions as Options<T>)?.parseResponse || (parseV0ApiResponseBody as (r: Response) => Promise<T>),
  });
}
