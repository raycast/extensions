import { search } from "./bibleGatewayApi";
import { useCachedPromise } from "@raycast/utils";

export function useBibleSearch(query: { search?: string; version?: string }) {
  return useCachedPromise(
    async (searchText?: string, version?: string) => {
      return await search(searchText!, version!);
    },
    [query.search, query.version],
    {
      execute: Boolean(query.search && query.version),
    },
  );
}
