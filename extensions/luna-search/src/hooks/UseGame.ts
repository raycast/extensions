import { Game, GameSummary, GameRequest } from "../models";
import { useFetch } from "@raycast/utils";
import { parseGame as parseResponse } from "./utilities";
import { useExpiringCache } from "./UseExpiringCache";
import { LUNA_API_ROUTE } from "../constants";

/**
 * The configuration object for the useFetch hook, including the initial data, response parsing, and HTTP method.
 */
const FETCH_CONFIG = {
  initialData: undefined,
  keepPreviousData: true,
  method: "POST",
  parseResponse,
};

/**
 * A custom React hook that fetches the game details for a given game summary, using an expiring cache to optimize the fetch requests.
 *
 * @param summary The GameSummary instance for which to fetch the game details.
 * @returns A tuple containing the Game instance (or undefined if not available) and a boolean indicating whether the data is currently being loaded.
 */
export function useGame(summary: GameSummary): [Game | undefined, isLoading: boolean] {
  const [cache] = useExpiringCache<Game | undefined>();

  /**
   * Checks if the game details are already cached and retrieves them if available.
   */
  const cachedResult = cache?.get(summary.title);
  const { body, headers } = new GameRequest(summary);

  /**
   * Determines whether to execute the fetch request based on the cache state.
   * If the cache is ready and there is no cached data, the fetch should be executed.
   */
  const execute = cache && !cachedResult;

  /**
   * Uses the useFetch hook to fetch the game details, passing the necessary configuration.
   * If the data is cached, it is returned immediately. Otherwise, the fetch is executed and the
   * result is cached using the ExpiringCache instance.
   */
  const { data, isLoading } = useFetch(LUNA_API_ROUTE, {
    ...FETCH_CONFIG,
    body: JSON.stringify(body),
    execute,
    headers,
    onData: (game) => cache?.set(summary.title, game),
  });

  // Side-step fetch if the cache knows best
  if (cache && cachedResult) {
    return [cachedResult, false];
  }

  return [data, isLoading];
}
