import type { FollowedChannel } from "@/interfaces/FollowedChannel";

import { useTwitchRequest } from "./useTwitchRequest";

export default function useFollowedChannels(userId?: string, cursorID?: string) {
  let url = `https://api.twitch.tv/helix/channels/followed?user_id=${userId}&first=100`;
  if (cursorID) {
    url += `&after=${cursorID}`;
  }
  const {
    data: { cursor, channels },
    isLoading,
  } = useTwitchRequest({
    url,
    initialData: { cursor: undefined, channels: [] as FollowedChannel[] },
    enabled: Boolean(userId),
    select: (data) => ({
      cursor: data.pagination.cursor as string | undefined,
      channels: data.data as FollowedChannel[],
    }),
  });
  return {
    cursor,
    channels,
    isLoading,
  };
}
