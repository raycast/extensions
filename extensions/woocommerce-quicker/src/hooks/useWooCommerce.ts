// Native fetch doesn't support a custom https agent for local/self-signed SSL stores.
// cross-fetch is used here to pass a custom agent that disables TLS verification.
import https from "node:https";
import fetch from "cross-fetch";
import { useFetch, usePromise } from "@raycast/utils";
import { WooStore } from "../types/types";

export async function fetchWooCommerce<T>(store: WooStore, endpoint: string, params?: Record<string, string>) {
  const url = generateUrl(store.storeUrl, endpoint, params);
  const headers = generateHeaders(store.consumerKey, store.consumerSecret);

  const localHttpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  const response = await fetch(url, {
    headers,
    ...(store.local ? { agent: localHttpsAgent } : {}),
  } as RequestInit & { agent?: https.Agent });

  return parseWooCommerceResponse<T>(response);
}

export function useWooCommerce<T>(store: WooStore, endpoint: string, params?: Record<string, string>) {
  const url = store ? generateUrl(store.storeUrl, endpoint, params) : "https://placeholder";
  const headers = store ? generateHeaders(store.consumerKey, store.consumerSecret) : undefined;

  const remoteRequest = useFetch<T>(url, {
    headers,
    execute: !!store && !store.local,
    parseResponse: parseWooCommerceResponse,
  });

  const localRequest = usePromise(
    (requestStore: WooStore, requestEndpoint: string, requestParams?: Record<string, string>) =>
      fetchWooCommerce<T>(requestStore, requestEndpoint, requestParams),
    [store, endpoint, params],
    {
      execute: !!store && store.local,
    },
  );
  const activeRequest = store.local ? localRequest : remoteRequest;

  return {
    data: activeRequest.data ?? null,
    isLoading: activeRequest.isLoading,
    revalidate: activeRequest.revalidate,
    error: activeRequest.error,
  };
}

async function parseWooCommerceResponse<T>(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      if (contentType.includes("application/json")) {
        const json = await response.json();
        message = (json && (json.message || json.error || json.data?.message)) || JSON.stringify(json);
      } else {
        message = (await response.text()) || message;
      }
    } catch {
      // ignore parse errors and fall back to statusText
    }

    throw new Error(`${response.status} ${message}`);
  }

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

function generateUrl(storeUrl: string, endpoint: string, params?: Record<string, string>) {
  const base = storeUrl.replace(/\/+$/, "");
  const ep = endpoint.replace(/^\/+/, "");
  const url = new URL(`${base}/wp-json/wc/v3/${ep}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

function generateHeaders(consumerKey: string, consumerSecret: string) {
  const encoded = btoa(`${consumerKey}:${consumerSecret}`);
  return {
    Authorization: `Basic ${encoded}`,
    "Content-Type": "application/json",
  };
}
