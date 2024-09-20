import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch, { FetchError, RequestInit } from "node-fetch";
import { NativePreferences } from "../types/preferences";

const { apiToken, apiUrl } = getPreferenceValues<NativePreferences>();

export const fetcher = async <T>(url: string, options?: RequestInit, payload?: unknown): Promise<T> => {
  if (!apiToken) {
    showToast({
      style: Toast.Style.Failure,
      title: "Something is wrong with your API Token key. Check your Raycast config and set up a new token.",
      message: "Something wrong with your API Token key. Check your Raycast config and set up a new token.",
    });
  }

  return fetch(`${apiUrl}${url}`, {
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
};

export const fetchPromise = async <T>(
  url: string,
  options?: RequestInit,
  payload?: unknown
): Promise<[T, null] | [null, FetchError | undefined]> => {
  if (!apiToken) {
    showToast({
      style: Toast.Style.Failure,
      title: "Something is wrong with your API Token key. Check your Raycast config and set up a new token.",
      message: "Something wrong with your API Token key. Check your Raycast config and set up a new token.",
    });
  }

  try {
    const result: Awaited<T> = await fetcher(url, options, payload);
    return [result, null];
  } catch (err) {
    return [null, err as FetchError];
  }
};
