import { Toast, showToast } from "@raycast/api";
import { Video } from "../interfaces/Video";
import { useState } from "react";
import { getHeaders } from "./auth";
import fetch from "node-fetch";

export default function useLoadMoreChannelVideos(channelId: string | undefined, initialCursor: string | undefined) {
  const [cursor, setCursor] = useState(initialCursor);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = () => {
    setIsLoading(true);
    getHeaders()
      .then((headers) => fetch(`https://api.twitch.tv/helix/videos?user_id=${channelId}&after=${cursor}`, { headers }))
      .then((response) => response.json())
      .then((data: any) => {
        setIsLoading(false);
        if (data && data.data) {
          setCursor(data.pagination.cursor);
          setVideos((prev) => prev.concat(data.data));
        } else if (data.message) {
          showToast({ title: "Error", message: data.message, style: Toast.Style.Failure });
        }
      });
  };

  return {
    videos,
    hasMore: Boolean(cursor),
    isLoading,
    loadMore,
    cursor,
  };
}
