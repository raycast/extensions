import Game from "../interfaces/Game";
import { useTwitchRequest } from "./useTwitchRequest";

export default function useLiveGames(query: string | undefined) {
  return useTwitchRequest<Game[]>({
    url: `https://api.twitch.tv/helix/search/categories?query=${query}&live_only=true`,
    initialData: [] as Game[],
    enabled: Boolean(query),
  });
}
