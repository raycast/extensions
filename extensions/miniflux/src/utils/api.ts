import fetch, { HeadersInit } from "node-fetch";
import { getPreferenceValues } from "@raycast/api";

import {
  MinifluxApiError,
  MinifluxEntries,
  MinifluxEntry,
  // IconInfo,
  OriginArticle,
  Category,
  EntryStatus,
  CreateFeedRequest,
  DiscoverRequest,
  DiscoveredFeed,
  ReadwiseRequest,
  ReadwiseResponse,
  ReadwiseError,
} from "./types";

const removeTrailingSlash = (baseUrl: string): string => (baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl);

const requestApi = async <T>(
  endpoint: string,
  queryParams?: string,
  method: "GET" | "POST" | "PUT" = "GET",
  body?: object
): Promise<T> => {
  const { baseUrl, apiKey }: Preferences = getPreferenceValues();

  if (!baseUrl || !apiKey) {
    throw new Error("baseUrl and apikey are required!");
  }

  const apiUrl = removeTrailingSlash(baseUrl);

  const headers: HeadersInit = { "X-Auth-Token": apiKey };
  if (method === "POST" || method === "PUT") {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(apiUrl + endpoint + (queryParams || ""), {
    method,
    headers,
    body: JSON.stringify(body),
  });

  if (response.status === 204) {
    return response.status as unknown as T;
  }

  if (!response.ok) {
    throw (await response.json()) as MinifluxApiError;
  }

  return (await response.json()) as T;
};

const getEntriesWithParams = async <T>(queryParams: string): Promise<T> => requestApi<T>("/v1/entries", queryParams);

const search = async (query: string): Promise<MinifluxEntries> => {
  const { searchLimit }: Preferences.Search = getPreferenceValues();

  return getEntriesWithParams<MinifluxEntries>(`?search=${query}${searchLimit ? "&limit=" + searchLimit : ""}`);
};

const getRecentEntries = async (): Promise<MinifluxEntries> => {
  const { feedLimit }: Preferences.ReadRecentEntries = getPreferenceValues();
  return getEntriesWithParams<MinifluxEntries>(`?status=unread&direction=desc&limit=${feedLimit}`);
};

const getEntryUrlInMiniflux = ({ id, status }: MinifluxEntry): string => {
  const { baseUrl }: Preferences = getPreferenceValues();
  const entryStatus = status === "read" ? "history" : status;

  return `${baseUrl}/${entryStatus}/entry/${id}`;
};

// const getIconForFeed = async ({ feed_id }: MinifluxEntry): Promise<IconInfo> =>
//   requestApi<IconInfo>(`/v1/feeds/${feed_id}/icon`);

const getOriginArticle = async ({ id }: MinifluxEntry): Promise<OriginArticle> =>
  requestApi<OriginArticle>(`/v1/entries/${id}/fetch-content`);

const getCategories = async (): Promise<Category[]> => requestApi<Category[]>("/v1/categories");

const toggleBookmark = async ({ id }: MinifluxEntry): Promise<boolean> =>
  (await requestApi<number>(`/v1/entries/${id}/bookmark`, "", "PUT")) === 204;

const updateEntries = async (id: number, status: EntryStatus): Promise<boolean> =>
  (await requestApi<number>(`/v1/entries`, "", "PUT", {
    entry_ids: [id],
    status,
  })) === 204;

const discoverFeed = async (setting: DiscoverRequest): Promise<DiscoveredFeed[]> =>
  await requestApi<DiscoveredFeed[]>("/v1/discover", "", "POST", setting);

const createFeed = async (setting: CreateFeedRequest): Promise<{ feed_id: number }> =>
  await requestApi<{ feed_id: number }>("/v1/feeds", "", "POST", setting);

const refreshAllFeed = async (): Promise<boolean> => (await requestApi<number>(`/v1/feeds/refresh`, "", "PUT")) === 204;

// Readwise API
const saveToReadwise = async (body: ReadwiseRequest): Promise<ReadwiseResponse> => {
  const { readwiseToken }: Preferences = getPreferenceValues();

  const response = await fetch("https://readwise.io/api/v3/save/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${readwiseToken}`,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 201) {
    throw new Error("Document already exist");
  }

  if (!response.ok) {
    throw (await response.json()) as ReadwiseError;
  }

  return (await response.json()) as Promise<ReadwiseResponse>;
};

export default {
  search,
  getRecentEntries,
  getEntryUrlInMiniflux,
  getOriginArticle,
  getCategories,
  toggleBookmark,
  updateEntries,
  discoverFeed,
  createFeed,
  refreshAllFeed,
  saveToReadwise,
};
