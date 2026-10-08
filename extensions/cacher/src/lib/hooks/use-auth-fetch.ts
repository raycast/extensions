import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { CONFIG } from "../../config";
import { Preferences } from "../types/preferences";
import fetch from "node-fetch";

type fetchMethod = "POST" | "GET" | "PUT" | "DELETE";

/**
 * Authenticated wrapper for interacting with Cacher API with `useFetch`.
 */
export function useAuthFetch<T>(
  path: string,
  options?: {
    method?: fetchMethod;
    keepPreviousData?: boolean;
    execute?: boolean;
  }
): ReturnType<typeof useFetch<T>> {
  const preferences = getPreferenceValues<Preferences>();
  const method = options?.method ?? "GET";
  const keepPreviousData = options?.keepPreviousData ?? true;

  // Skip calling function if false
  const execute = options?.execute ?? true;

  return useFetch<T>(`${CONFIG.apiURL}/raycast/${path}`, {
    method,
    headers: {
      "X-Api-Key": preferences.apiKey,
      "X-Api-Token": preferences.apiToken,
    },
    keepPreviousData,
    execute,
  });
}

/**
 * Authenticated wrapper for interacting with `fetch`.
 */
export async function authFetch(
  path: string,
  options?: {
    method?: fetchMethod;
    data?: unknown;
  }
) {
  const preferences = getPreferenceValues<Preferences>();
  const method = options?.method ?? "GET";
  const data = options?.data ?? {};

  return await fetch(`${CONFIG.apiURL}/raycast/${path}`, {
    method,
    headers: {
      "X-Api-Key": preferences.apiKey,
      "X-Api-Token": preferences.apiToken,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}
