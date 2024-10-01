import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { StartSpanOptions } from "@sentry/node";
import fetch, { FetchError, RequestInit } from "node-fetch";
import { NativePreferences } from "../types/preferences";
import { errorCoverage, ErrorCoverageOptions } from "./sentry";

const { apiToken, apiUrl } = getPreferenceValues<NativePreferences>();

export type FetcherOptions = {
  init?: RequestInit;
  payload?: unknown;
  errorOptions?: {
    spanOptions?: StartSpanOptions;
    coverageOptions?: Omit<ErrorCoverageOptions<true>, "rethrowExceptions">;
  };
};

export const fetcher = async <T>(url: string, options: FetcherOptions = {}): Promise<T> => {
  const { init, payload, errorOptions } = options;
  if (!apiToken) {
    showToast({
      style: Toast.Style.Failure,
      title: "Something is wrong with your API Token key. Check your Raycast config and set up a new token.",
      message: "Something wrong with your API Token key. Check your Raycast config and set up a new token.",
    });
  }

  return (
    await errorCoverage(
      { name: "fetcher-call", ...errorOptions?.spanOptions },
      () =>
        fetch(`${apiUrl}${url}`, {
          ...init,
          body: payload ? JSON.stringify(payload) : undefined,
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            ...init?.headers,
          },
        }).then<T>((r) => r.json()),
      { rethrowExceptions: true, ...errorOptions?.coverageOptions }
    )
  ).data;
};

export type FetchPromiseOptions = FetcherOptions;

export const fetchPromise = async <T>(
  url: string,
  options?: FetchPromiseOptions
): Promise<[T, null] | [null, FetchError | undefined]> => {
  if (!apiToken) {
    showToast({
      style: Toast.Style.Failure,
      title: "Something is wrong with your API Token key. Check your Raycast config and set up a new token.",
      message: "Something wrong with your API Token key. Check your Raycast config and set up a new token.",
    });
  }

  try {
    const result: Awaited<T> = await fetcher(url, options);
    return [result, null];
  } catch (err) {
    return [null, err as FetchError];
  }
};
