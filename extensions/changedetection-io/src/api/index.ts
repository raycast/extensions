import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { SortBy, SortOrder, TagsResponse, UseWatchesResult, WatchesResponse, WatchWithID } from "../types";

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

export const useWatches = ({ sortBy, sortOrder }: { sortBy: SortBy; sortOrder: SortOrder }) => {
  const { data: watchesResponse, ...rest } = useApi<WatchesResponse>("watch");
  const watches: UseWatchesResult = Object.entries(watchesResponse ?? {})
    .map(([id, watch]) => {
      // We're fixing an issue here where it doesn't make sense it is not seen as viewed when it has not changed yet
      if (!watch.viewed && !watch.last_changed) {
        watch.viewed = true;
      }
      return { ...watch, id } as WatchWithID;
    })
    .reduce(
      (acc: UseWatchesResult, watch) => {
        if (watch.viewed) {
          acc.seen.push(watch);
        } else {
          acc.unseen.push(watch);
        }
        return acc;
      },
      { unseen: [], seen: [] },
    );

  if (sortBy === "last_checked") {
    watches.unseen.sort((a, b) =>
      sortOrder === "asc" ? a.last_checked - b.last_checked : b.last_checked - a.last_checked,
    );
    watches.seen.sort((a, b) =>
      sortOrder === "asc" ? a.last_checked - b.last_checked : b.last_checked - a.last_checked,
    );
  } else if (sortBy === "last_changed") {
    watches.unseen.sort((a, b) =>
      sortOrder === "asc" ? a.last_changed - b.last_changed : b.last_changed - a.last_changed,
    );
    watches.seen.sort((a, b) =>
      sortOrder === "asc" ? a.last_changed - b.last_changed : b.last_changed - a.last_changed,
    );
  }
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
