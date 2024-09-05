import { getPreferenceValues } from "@raycast/api";
import fetch, { FetchError, RequestInit } from "node-fetch";
import { NativePreferences } from "../types/preferences";

const { apiToken, apiUrl } = getPreferenceValues<NativePreferences>();

export const fetcher = async <T>(url: string, options?: RequestInit, payload?: unknown): Promise<T> =>
  fetch(`${apiUrl}${url}`, {
    ...options,
    body: payload ? JSON.stringify(payload) : undefined,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options?.headers,
    },
  })
    .then((r) => r.json())
    .catch((e) => console.error(e));

export const fetchPromise = async <T>(
  url: string,
  options?: RequestInit,
  payload?: unknown
): Promise<[T, null] | [null, FetchError | undefined]> => {
  try {
    const result: Awaited<T> = await fetcher(url, options, payload);
    return [result, null];
  } catch (err) {
    return [null, err as FetchError];
  }
};
