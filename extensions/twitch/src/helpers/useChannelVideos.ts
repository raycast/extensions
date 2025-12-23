import { Video } from "../interfaces/Video";
import { useTwitchRequest } from "./useTwitchRequest";

export default function useChannelVideos(channelId: string | undefined) {
  const {
    data: { cursor, videos },
    isLoading,
  } = useTwitchRequest({
    url: `https://api.twitch.tv/helix/videos?user_id=${channelId}`,
    initialData: { cursor: undefined, videos: [] as Video[] },
    enabled: Boolean(channelId),
    select: (data) => ({
      cursor: data.pagination.cursor as string | undefined,
      videos: data.data as Video[],
    }),
  });
  return {
    cursor,
    videos,
    isLoading,
  };
}
