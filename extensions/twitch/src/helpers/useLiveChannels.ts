import Item from "../interfaces/FollowingItem";
import { useTwitchRequest } from "./useTwitchRequest";

export default function useLiveChannels(query: string | undefined) {
  return useTwitchRequest<Item[]>({
    url: `https://api.twitch.tv/helix/search/channels?query=${query}&live_only=true`,
    initialData: [] as Item[],
    enabled: Boolean(query),
  });
}
