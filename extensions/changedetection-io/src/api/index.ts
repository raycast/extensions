import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { TagsResponse, WatchesResponse, WatchWithID } from "../types";

export const { instance_url, api_key } = getPreferenceValues<Preferences>();

const headers = {
  "Content-Type": "application/json",
  "x-api-key": api_key,
};

export const validUrl = () => {
  try {
    new URL(instance_url);
  } catch {
    return false;
  }
  return true;
};

export const useApi = <T>(endpoint: string) => {
  const url = new URL(`api/v1/${endpoint}`, instance_url).toString();
  return useFetch<T>(url, {
    headers,
  });
};

export const useTags = () => {
  const { data: tagsResponse, ...rest } = useApi<TagsResponse>("tag");
  const tags = Object.values(tagsResponse ?? {});
  return { data: tags, ...rest };
};

export const useWatches = () => {
  const { data: watchesResponse, ...rest } = useApi<WatchesResponse>("watch");
  const watches = Object.entries(watchesResponse ?? {}).map(([id, watch]) => ({ ...watch, id })) as WatchWithID[];
  return { data: watches, ...rest };
};

export const callApi = async (
  endpoint: string,
  { method, body }: { method: "DELETE" | "POST"; body?: Record<string, string | boolean> },
) => {
  const url = new URL(`api/v1/${endpoint}`, instance_url).toString();
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return;
  const result = await response.json();
  if (!response.ok) {
    const err = result as { message: string } | string;
    throw new Error(typeof err === "object" ? err.message : err);
  }
  return result;
};
