import { useCachedPromise } from "@raycast/utils";
import { pexelsClient } from "../utils/pexels-utils";
import { Collection, ErrorResponse } from "pexels";
import { CollectionsResponse } from "../types/types";

export function useCollections(collectionTag: string) {
  return useCachedPromise(
    (collectionTag: string) => async (options) => {
      let _featuredCollections;
      if (collectionTag === "0") {
        _featuredCollections = (await pexelsClient.collections.all({
          per_page: 30,
          page: options.page + 1,
        })) as CollectionsResponse | ErrorResponse;
      } else {
        _featuredCollections = (await pexelsClient.collections.featured({
          per_page: 30,
          page: options.page + 1,
        })) as CollectionsResponse | ErrorResponse;
      }

      if ((_featuredCollections as ErrorResponse).error) {
        return { data: [], hasMore: false };
      } else {
        const collections = _featuredCollections as CollectionsResponse;
        return {
          data: collections.collections as Collection[],
          hasMore: collections.collections.length == 30 && options.page <= 10,
        };
      }
    },
    [collectionTag],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Failed to load collections" },
    },
  );
}
