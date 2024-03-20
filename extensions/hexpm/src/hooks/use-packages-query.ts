import { environment } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Package } from "../types";

type HexPackagesResponse = Package[];

export function usePackagesQuery(props: {
  search: string;
  sort: "name" | "total_downloads" | "recent_downloads" | "inserted_at" | "updated_at";
  onError?(error: Error): void;
}) {
  return useFetch<HexPackagesResponse, HexPackagesResponse, HexPackagesResponse>(
    (pagination) => {
      const url = new URL("https://hex.pm/api/packages");
      url.searchParams.append("sort", props.sort);
      url.searchParams.append("search", props.search);
      url.searchParams.append("page", String(pagination.page + 1));
      return url.toString();
    },
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        UserAgent: `Raycast/${environment.raycastVersion} (${environment.extensionName})`,
      },
      // -----------------------------------------------------------------------
      execute: props.search.length > 0,
      keepPreviousData: true,
      initialData: [],
      onError: props.onError,
      mapResult(resp: Package[]) {
        return {
          data: resp,
          // Note: Ideally the API would return the total number of items
          // and we could calculate hasMore based on that. But since the API
          // doesn't return that, we assume that if the response is not empty,
          // there are more items to fetch.
          hasMore: resp.length !== 0,
        };
      },
    },
  );
}
