import { FollowedChannel } from "../interfaces/FollowedChannel";
import { useTwitchRequest } from "./useTwitchRequest";

export default function useFollowedChannels(userId: string | undefined) {
  return useTwitchRequest<FollowedChannel[]>({
    url: `https://api.twitch.tv/helix/channels/followed?user_id=${userId}`,
    initialData: [] as FollowedChannel[],
    enabled: Boolean(userId),
  });
}
