import { environment, showToast, Toast } from "@raycast/api";
import { XMLParser } from "fast-xml-parser";
import fetch, { AbortError } from "node-fetch";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { getPreferences } from "./preferences";
import { useFetch } from "@raycast/utils";
import { API_HEADERS, BASE_URL } from "./config";
type Fetcher<R> = (signal: AbortSignal) => Promise<R>;

export function useNextcloudJsonArray<T>(base: string) {
  const { isLoading, data } = useFetch(`${BASE_URL}/apps/${base}`, {
    headers: {
      ...API_HEADERS,
      "OCS-APIRequest": "true",
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    mapResult(result: T[]) {
      return {
        data: result,
      };
    },
    initialData: [],
  });
  return { isLoading, data };
}

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

export async function webdavRequest({
  signal,
  body,
  base = "",
  method,
}: {
  signal: AbortSignal;
  body: string;
  base?: string;
  method: string;
}) {
  const { hostname, username, password } = getPreferences();

  const response = await fetch(`https://${hostname}/remote.php/dav/${encodeURI(base)}`, {
    method,
    headers: {
      "User-Agent": `Raycast/${environment.raycastVersion}`,
      "Content-Type": "text/xml",
      Authorization: "Basic " + Buffer.from(username + ":" + password).toString("base64"),
    },
    body,
    signal,
  });
  const responseBody = await response.text();

  const parser = new XMLParser();
  const dom = parser.parse(responseBody);
  if (!("d:multistatus" in dom)) {
    throw new Error("Invalid response: " + responseBody);
  }

  // undefined -> No result
  // Object -> Single hit
  // Array -> Multiple hits
  const dres = dom["d:multistatus"]["d:response"] ?? [];
  return Array.isArray(dres) ? dres : [dres];
}
