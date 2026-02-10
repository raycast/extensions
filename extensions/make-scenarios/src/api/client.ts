import { getPreferenceValues } from "@raycast/api";
import { Zone } from "./types.js";

function getAuthHeader(): string {
  const { apiToken } = getPreferenceValues<{ apiToken: string }>();
  const token = apiToken.trim();
  if (!token) {
    throw new Error("API token is empty. Set it in extension preferences.");
  }
  // Handle both "Token xxx" and bare "xxx" input
  if (token.toLowerCase().startsWith("token ")) {
    return token;
  }
  return `Token ${token}`;
}

function baseUrl(zone: Zone): string {
  return `https://${zone}/api/v2`;
}

export interface FetchOptions {
  zone: Zone;
  path: string;
  params?: Record<string, string>;
  signal?: AbortSignal;
}

const MAX_PAGES = 50;

export async function apiFetch<T>(options: FetchOptions): Promise<T> {
  const { zone, path, params, signal } = options;
  const url = new URL(`${baseUrl(zone)}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    signal,
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Authentication failed on ${zone}. Check your API token.`,
      );
    }
    throw new Error(
      `API error ${response.status}: ${response.statusText} (${zone}${path})`,
    );
  }

  return response.json() as Promise<T>;
}

export async function apiFetchAllPages<T>(
  options: FetchOptions,
  key: string,
): Promise<T[]> {
  const allItems: T[] = [];
  let offset = 0;
  const limit = 100;

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = {
      ...options.params,
      "pg[offset]": String(offset),
      "pg[limit]": String(limit),
    };
    const data = await apiFetch<Record<string, unknown>>({
      ...options,
      params,
    });
    const items = data[key];
    if (!Array.isArray(items)) break;
    allItems.push(...(items as T[]));

    if (items.length < limit) break;
    offset += limit;
  }

  return allItems;
}
