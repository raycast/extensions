import { environment, showToast, Toast } from "@raycast/api";
import { XMLParser } from "fast-xml-parser";
import fetch, { AbortError } from "node-fetch";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { getPreferences } from "./preferences";

type Fetcher<A, R> = (args: { signal: AbortSignal; args?: A }) => Promise<R>;

export function useQuery<A, R>(fetcher: Fetcher<A, R>, deps: React.DependencyList = []) {
  const [state, setState] = useState<{ results: R | null; isLoading: boolean }>({ results: null, isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  const perform = useCallback(
    async function perform(args?: A) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await fetcher({ signal: cancelRef.current.signal, args });
        setState((oldState) => ({
          ...oldState,
          results,
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
    [cancelRef, setState, ...deps]
  );

  useEffect(() => {
    return () => {
      cancelRef.current?.abort();
    };
  }, deps);

  return {
    state,
    perform,
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

export async function jsonRequest<T>({
  signal,
  base,
  body,
  method = "GET",
}: {
  signal: AbortSignal;
  base: string;
  body?: Record<string, unknown>;
  method?: string;
}) {
  const { hostname, username, password } = getPreferences();

  console.log(`https://${hostname}/apps/${base}`);
  const response = await fetch(`https://${hostname}/apps/${base}`, {
    method,
    headers: {
      "OCS-APIRequest": "true",
      "User-Agent": `Raycast/${environment.raycastVersion}`,
      "Content-Type": "application/json",
      authorization: "Basic " + Buffer.from(username + ":" + password).toString("base64"),
    },
    body: JSON.stringify(body),
    signal,
  });
  return (await response.json()) as T;
}
