import { useCachedPromise } from "@raycast/utils";
import { pexelsClient } from "../utils/pexels-utils";
import { ErrorResponse, Photos } from "pexels";
import { Photo } from "pexels/dist/types";
import { isEmpty } from "../utils/common-utils";

export function usePhotos(searchContent: string) {
  return useCachedPromise(
    (searchContent: string) => async (options) => {
      if (isEmpty(searchContent)) {
        return { data: [], hasMore: false };
      }
      const photos = await pexelsClient.photos.search({
        query: searchContent,
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
    [searchContent],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Failed to load photos" },
    },
  );
}
