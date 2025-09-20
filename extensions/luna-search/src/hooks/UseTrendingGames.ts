import { GameSummary, SearchRequest } from "../models";
import { useFetch } from "@raycast/utils";
import { parseGameSummaries } from "./utilities";
import { useExpiringCache } from "./UseExpiringCache";
import { LUNA_API_ROUTE } from "../constants";

/**
 * The configuration object for the useFetch hook when fetching the trending games,
 * including the request body and headers, initial data, response parsing, and HTTP method.
 */
const FETCH_CONFIG = {
  body: JSON.stringify(new SearchRequest("").body),
  headers: new SearchRequest("").headers,
  initialData: [],
  keepPreviousData: true,
  method: "POST",
  parseResponse: (response: Response) => parseGameSummaries(WIDGET_ID, response),
};

/**
 * The ID of the widget that contains the trending games in the Luna API response.
 */
const WIDGET_ID = "collection_trending_on_tempo";

/**
 * A custom React hook that fetches the trending games, using an expiring cache to optimize the fetch requests.
 *
 * @returns A tuple containing the array of GameSummary instances for the trending games
 * and a boolean indicating whether the data is currently being loaded.
 */
export function useTrendingGames(): [GameSummary[], isLoading: boolean] {
  const [cache] = useExpiringCache<GameSummary[]>();
  const cachedResults = cache?.get(WIDGET_ID);

  /**
   * Uses the useFetch hook to fetch the trending games, passing the necessary configuration.
   * If the data is cached, it is returned immediately. Otherwise, the fetch is executed and the
   * result is cached using the ExpiringCache instance.
   */
  const { data, isLoading } = useFetch(LUNA_API_ROUTE, {
    ...FETCH_CONFIG,
    execute: cache && !cachedResults, // Run only when the cache is ready and there is no cached value
    onData: (games: GameSummary[]) => cache?.set(WIDGET_ID, games),
  });

  // Side-step fetch if the cache knows best
  if (cachedResults) {
    return [cachedResults, false];
  }

  return [data, isLoading];
}
