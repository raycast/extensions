import { useFetch } from "@raycast/utils";
import { V0ApiError, type V0ErrorResponse } from "../lib/v0-api-utils";

interface Options<T> extends Omit<RequestInit, "body"> {
  body?: Record<string, unknown> | string;
  execute?: boolean;
  onError?: (error: Error) => void;
  onData?: (data: T) => void;
  initialData?: T;
  keepPreviousData?: boolean;
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
    parseResponse: async (response) => {
      if (!response.ok) {
        const errorResponse: V0ErrorResponse = await response.json();
        throw new V0ApiError(
          errorResponse.error.message || `Request failed with status ${response.status}`,
          errorResponse,
          response.status,
        );
      }
      return response.json() as Promise<T>;
    },
  });
}
