import { useFetch } from "@raycast/utils";
import { useRef } from "react";
import { LDFlagsResponse } from "../types";
import { ldHeaders, ldUrl, parseJsonResponse } from "../api/client";

export const FLAGS_PAGE_SIZE = 20;

/** Dropdown value → API `filter` fragments. `mine` is resolved with the caller's member ID. */
export type FlagFilterValue =
  "state:live" | "state:deprecated" | "state:archived" | "type:temporary" | "type:permanent" | "mine" | `tag:${string}`;

export function buildFilter(value: FlagFilterValue, searchText: string, memberId?: string): string {
  const filters: string[] = [];
  if (value.startsWith("state:")) filters.push(value);
  else filters.push("state:live");

  if (value.startsWith("type:")) filters.push(value);
  if (value === "mine" && memberId) filters.push(`maintainerId:${memberId}`);
  if (value.startsWith("tag:")) filters.push(`tags:${value.slice(4)}`);

  // The filter list is comma-delimited, so a comma in the search would start a new filter.
  const query = searchText.replace(/,/g, " ").trim();
  if (query) filters.push(`query:${query}`);
  return filters.join(",");
}

interface UseLDFlagsParams {
  projectKey: string;
  searchText: string;
  filter: FlagFilterValue;
  memberId?: string;
  /** Set to false while prerequisites (project key, member ID) are still loading. */
  enabled?: boolean;
}

export function useLDFlags({ projectKey, searchText, filter, memberId, enabled = true }: UseLDFlagsParams) {
  const totalCountRef = useRef(0);

  const { data, isLoading, error, pagination, revalidate } = useFetch(
    (options) =>
      ldUrl(`/api/v2/flags/${encodeURIComponent(projectKey)}`, {
        sort: "-creationDate",
        limit: FLAGS_PAGE_SIZE,
        offset: options.page * FLAGS_PAGE_SIZE,
        filter: buildFilter(filter, searchText, memberId),
      }),
    {
      headers: ldHeaders(),
      parseResponse: (response) => parseJsonResponse<LDFlagsResponse>(response),
      mapResult: (result) => {
        totalCountRef.current = result.totalCount ?? result.items?.length ?? 0;
        return {
          data: result.items ?? [],
          hasMore: Boolean(result._links?.next),
        };
      },
      keepPreviousData: true,
      execute: enabled && (filter !== "mine" || Boolean(memberId)),
    },
  );

  return {
    flags: data ?? [],
    totalCount: totalCountRef.current,
    isLoading,
    error,
    pagination,
    revalidate,
  };
}
