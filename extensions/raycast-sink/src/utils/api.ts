import fetch from "node-fetch";
import { URL } from "url";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";

async function getApiConfig() {
  const preferences = getPreferenceValues<Preferences>();
  const { host, token } = preferences;
  if (!host || !token) {
    throw new Error("API configuration is not initialized");
  }
  return { host, token };
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function fetchWithAuth(path: string, options: FetchOptions = {}): Promise<unknown> {
  const { host, token } = await getApiConfig();
  const url = new URL(path, host);
  const response = await fetch(url.toString(), {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Raycast Extension",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}, body: ${data}`);
  }

  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

export async function fetchLinks(cursor?: string) {
  const path = cursor ? `/api/link/list?cursor=${cursor}&limit=500` : "/api/link/list";
  return fetchWithAuth(path);
}

export async function queryLink(slug: string) {
  return fetchWithAuth(`/api/link/query?slug=${slug}`);
}

export async function createLink(url: string, slug?: string, comment?: string) {
  return fetchWithAuth("/api/link/create", {
    method: "POST",
    body: { url, slug, comment },
  });
}

export async function deleteLink(slug: string): Promise<void> {
  await fetchWithAuth("/api/link/delete", {
    method: "POST",
    body: { slug },
  });
}

export async function editLink(slug: string, url: string, comment?: string) {
  return fetchWithAuth("/api/link/edit", {
    method: "PUT",
    body: { slug, url, comment },
  });
}

export async function statsCounter(id: string) {
  return fetchWithAuth(`/api/stats/counters?id=${id}`);
}
