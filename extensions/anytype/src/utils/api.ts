import { LocalStorage } from "@raycast/api";
import fetch, { Headers as FetchHeaders } from "node-fetch";
import { errorConnectionMessage, localStorageKeys } from "./constant";
import { checkResponseError } from "./error";

interface FetchOptions {
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ApiResponse<T> {
  headers: FetchHeaders;
  payload: T;
}

/**
 * A central API fetch function that applies uniform error handling.
 * @param url The URL to fetch.
 * @param options The fetch options.
 * @returns The API response.
 */
export async function apiFetch<T>(url: string, options: FetchOptions): Promise<ApiResponse<T>> {
  try {
    const token = await LocalStorage.getItem(localStorageKeys.appKey);
    const response = await fetch(url, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...options.headers,
      },
      body: options.body,
    });

    await checkResponseError(response);

    try {
      const json = (await response.json()) as T;
      return {
        payload: json,
        headers: response.headers,
      };
    } catch (jsonError) {
      throw new Error("Failed to parse JSON response");
    }
  } catch (error) {
    if (error instanceof Error && (error as { code?: string }).code === "ECONNREFUSED") {
      throw new Error(errorConnectionMessage);
    }
    throw error;
  }
}
