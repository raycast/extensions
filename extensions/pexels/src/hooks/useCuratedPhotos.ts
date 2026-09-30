import { useCachedPromise } from "@raycast/utils";
import { pexelsClient } from "../utils/pexels-utils";
import { ErrorResponse, Photos } from "pexels";
import { Photo } from "pexels/dist/types";

export function useCuratedPhotos() {
  return useCachedPromise(
    () => async (options) => {
      const photos = await pexelsClient.photos.curated({
        per_page: 30,
        page: options.page + 1,
      });
      if ((photos as ErrorResponse).error) {
        return { data: [], hasMore: false };
      } else {
        return {
          data: (photos as Photos).photos as Photo[],
          hasMore: (photos as Photos).photos.length == 30 && options.page <= 10,
        };
      }
    },
    [],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Failed to load photos" },
    },
  );
}
