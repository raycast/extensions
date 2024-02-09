import fetch from "node-fetch";
import { useCallback, useState } from "react";

import { Toast, showToast } from "@raycast/api";

import { getHeaders } from "@/helpers/auth";
import type { Video } from "@/interfaces/Video";

type DataResponse = {
  data: Video[];
  pagination: {
    cursor: string;
  };
};

type DataErrorResponse = {
  message: string;
};

export default function useLoadMoreChannelVideos(channelId: string | undefined, initialCursor: string | undefined) {
  const [cursor, setCursor] = useState(initialCursor);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(async () => {
    setIsLoading(true);
    getHeaders()
      .then((headers) => fetch(`https://api.twitch.tv/helix/videos?user_id=${channelId}&after=${cursor}`, { headers }))
      .then((response) => response.json() as Promise<DataResponse | DataErrorResponse>)
      .then((data?: DataResponse | DataErrorResponse) => {
        setIsLoading(false);
        if (data && (data as DataResponse).data) {
          setCursor((data as DataResponse).pagination.cursor);
          setVideos((prev) => prev.concat((data as DataResponse).data));
        } else if ((data as DataErrorResponse).message) {
          showToast({ title: "Error", message: (data as DataErrorResponse).message, style: Toast.Style.Failure });
        }
      });
  }, [channelId, cursor]);

  return {
    videos,
    hasMore: Boolean(cursor),
    isLoading,
    loadMore,
    cursor,
  };
}
