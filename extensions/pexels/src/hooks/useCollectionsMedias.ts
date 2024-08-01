import { useCachedPromise } from "@raycast/utils";
import { pexelsClient } from "../utils/pexels-utils";
import { ErrorResponse, Photo, Video } from "pexels";
import { CollectionMediasResponse } from "../types/types";

export function useCollectionMedias(collectionId: string) {
  return useCachedPromise(
    (collectionId: string) => async (options) => {
      const _featuredCollectionMedias = (await pexelsClient.collections.media({
        id: collectionId,
        per_page: 30,
        page: options.page + 1,
        type: "photos",
      })) as CollectionMediasResponse | ErrorResponse;

      if ((_featuredCollectionMedias as ErrorResponse).error) {
        return { data: [], hasMore: false };
      } else {
        const collectionMedias = _featuredCollectionMedias as CollectionMediasResponse;
        return {
          data: collectionMedias.media as (
            | (Photo & { type: "Video" | "Photo" })
            | (Video & { type: "Video" | "Photo" })
          )[],
          hasMore: collectionMedias.media.length == 30 && options.page <= 10,
        };
      }
    },
    [collectionId],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Failed to load collection medias" },
    },
  );
}
