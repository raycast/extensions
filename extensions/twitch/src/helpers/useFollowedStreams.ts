import { FollowedStreams } from "../interfaces/FollowedStreams";
import { useTwitchRequest } from "./useTwitchRequest";

export default function useFollowedStreams(userId: string | undefined, options: { loadingWhileStale?: boolean } = {}) {
  return useTwitchRequest<FollowedStreams[]>({
    url: `https://api.twitch.tv/helix/streams/followed?user_id=${userId}`,
    initialData: [] as FollowedStreams[],
    enabled: Boolean(userId),
    ...options,
  });
}
