import { environment, showToast, Toast } from "@raycast/api";
import fetch, { AbortError } from "node-fetch";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { getPreferences } from "./preferences";

type Fetcher<R> = (signal: AbortSignal) => Promise<R>;

export function useQuery<R>(fetcher: Fetcher<R>, deps: React.DependencyList = []) {
  const [state, setState] = useState<{ data: R | null; isLoading: boolean }>({ data: null, isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);
  const perform = useCallback(
    async function perform() {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();

      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));

      try {
        const data = await fetcher(cancelRef.current.signal);

        setState((oldState) => ({
          ...oldState,
          data,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        if (error instanceof AbortError) {
          return;
        }

        console.error("API error:", error);

        showToast({ style: Toast.Style.Failure, title: "API request failed", message: String(error) });
      }
    },
    [cancelRef, setState, fetcher]
  );

  useEffect(() => {
    perform();

    return () => {
      cancelRef.current?.abort();
    };
  }, deps);

  const { isLoading, data } = state;

  return {
    isLoading,
    data,
  };
}

export async function apiRequest(
  base: string,
  {
    params = {},
    body,
  }: {
    params?: Record<string, unknown>;
    body?: Record<string, unknown>;
    signal: AbortSignal;
  }
) {
  const { apiKey } = getPreferences();
  // console.log(`https://holodex.net/api/v2/${base}?` + toParams(params), body);
  const res = await fetch(`https://holodex.net/api/v2/${base}?` + toParams(params), {
    method: body ? "POST" : "GET",
    body: JSON.stringify(body),
    headers: {
      "X-APIKEY": apiKey,
      "User-Agent": `Raycast/${environment.raycastVersion}`,
      ...(body ? { "Content-Type": "application/json" } : null),
    },
  });

  return await res.json();
}

function toParams(json: Record<string, unknown>): string {
  const params = Object.fromEntries(
    Object.entries(json).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : String(v)])
  );

  return new URLSearchParams(params).toString();
}
