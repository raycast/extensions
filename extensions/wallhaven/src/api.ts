import { getPreferenceValues } from "@raycast/api";
import {
  SearchParams,
  SearchResponse,
  WallpaperResponse,
  CollectionsResponse,
} from "./types";

const BASE_URL = "https://wallhaven.cc/api/v1";

function getHeaders(): Record<string, string> {
  const { apiKey } = getPreferenceValues<Preferences>();
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }
  return headers;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        "Rate limit exceeded. Please wait a moment and try again.",
      );
    }
    if (response.status === 401) {
      throw new Error(
        "Unauthorized. Check your API key in extension preferences.",
      );
    }
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function searchWallpapers(
  params: SearchParams,
): Promise<SearchResponse> {
  const url = new URL(`${BASE_URL}/search`);
  if (params.q) url.searchParams.set("q", params.q);
  if (params.categories) url.searchParams.set("categories", params.categories);
  if (params.purity) url.searchParams.set("purity", params.purity);
  if (params.sorting) url.searchParams.set("sorting", params.sorting);
  if (params.order) url.searchParams.set("order", params.order);
  if (params.topRange && params.sorting === "toplist")
    url.searchParams.set("topRange", params.topRange);
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.seed) url.searchParams.set("seed", params.seed);
  return fetchJSON<SearchResponse>(url.toString());
}

export async function getWallpaper(id: string): Promise<WallpaperResponse> {
  return fetchJSON<WallpaperResponse>(`${BASE_URL}/w/${id}`);
}

export async function getCollections(): Promise<CollectionsResponse> {
  return fetchJSON<CollectionsResponse>(`${BASE_URL}/collections`);
}

export async function getCollectionWallpapers(
  username: string,
  id: number,
  page: number = 1,
): Promise<SearchResponse> {
  const url = new URL(
    `${BASE_URL}/collections/${encodeURIComponent(username)}/${id}`,
  );
  url.searchParams.set("page", String(page));
  return fetchJSON<SearchResponse>(url.toString());
}
