import { FollowedChannel } from "../interfaces/FollowedChannel";
import { useTwitchRequest } from "./useTwitchRequest";

export default function useFollowedChannels(userId: string | undefined) {
  return useTwitchRequest<FollowedChannel[]>({
    url: `https://api.twitch.tv/helix/channels/followed?user_id=${userId}`,
    cacheKey: `followed_channels_${userId}`,
    initialData: [] as FollowedChannel[],
    enabled: Boolean(userId),
  });
}
