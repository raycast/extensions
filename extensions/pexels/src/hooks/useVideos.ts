import { useCachedPromise } from "@raycast/utils";
import { pexelsClient } from "../utils/pexels-utils";
import { ErrorResponse, Video, Videos } from "pexels";
import { isEmpty } from "../utils/common-utils";

export function useVideos(searchContent: string) {
  return useCachedPromise(
    (searchContent: string) => async (options) => {
      if (isEmpty(searchContent)) {
        return { data: [], hasMore: false };
      }
      const videos = await pexelsClient.videos.search({
        query: searchContent,
        per_page: 30,
        page: options.page + 1,
      });
      if ((videos as ErrorResponse).error) {
        return { data: [], hasMore: false };
      } else {
        return {
          data: (videos as Videos).videos as Video[],
          hasMore: (videos as Videos).videos.length == 30 && options.page <= 10,
        };
      }
    },
    [searchContent],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Failed to load videos" },
    },
  );
}
