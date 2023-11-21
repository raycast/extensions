import Item from "../interfaces/FollowingItem";
import { useTwitchRequest } from "./useTwitchRequest";

export default function useLiveChannels(query: string | undefined) {
  return useTwitchRequest<Item[]>({
    url: `https://api.twitch.tv/helix/search/channels?query=${query}&live_only=true`,
    cacheKey: `live_channels_${query}`,
    initialData: [] as Item[],
    enabled: Boolean(query),
    cacheDuration: 10_000,
  });
}
