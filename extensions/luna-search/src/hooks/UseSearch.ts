import { GameSummary, SearchRequest } from "../models";
import { useFetch } from "@raycast/utils";
import { parseGameSummaries } from "./utilities";
import { useExpiringCache } from "./UseExpiringCache";
import { LUNA_API_ROUTE } from "../constants";

/**
 * The configuration object for the useFetch hook when performing a search query,
 * including the initial data, response parsing, and HTTP method.
 */
const QUERY_CONFIG = {
  initialData: [],
  keepPreviousData: true,
  method: "POST",
  parseResponse: (response: Response) => parseGameSummaries(WIDGET_ID, response),
};

/**
 * The ID of the widget that contains the game summaries in the Luna API response.
 */
const WIDGET_ID = "collection_grid_search";

/**
 * Determines whether the search input is executable, which means it has a length of at least 3 characters.
 *
 * @param search The search input string.
 * @returns true if the search input is executable, false otherwise.
 */
function isExecutable(search?: string) {
  if (!search) {
    return false;
  }
  return search.length >= 3;
}

/**
 * A custom React hook that fetches the game summaries based on the provided search query,
 * using an expiring cache to optimize the fetch requests.
 *
 * @param search The search query to use for fetching the game summaries.
 * @returns A tuple containing the array of GameSummary instances and a boolean indicating whether the data is currently being loaded.
 */
export function useSearch(search?: string): [GameSummary[], isLoading: boolean] {
  const [cache] = useExpiringCache<GameSummary[]>();
  const cachedResults = cache?.get(search ?? "");
  const { body, headers } = new SearchRequest(search ?? "");

  /**
   * Determines whether to execute the fetch request based on the cache state and the search input.
   * The fetch should be executed only when the cache is ready, there is no cached data, and the search input is executable.
   */
  const execute = cache && !cachedResults && isExecutable(search);

  /**
   * Uses the useFetch hook to fetch the game summaries, passing the necessary configuration.
   * If the data is cached, it is returned immediately. Otherwise, the fetch is executed and the
   * result is cached using the ExpiringCache instance.
   */
  const { data, isLoading } = useFetch(LUNA_API_ROUTE, {
    ...QUERY_CONFIG,
    body: JSON.stringify(body),
    execute,
    headers,
    onData: (games) => cache?.set(search ?? "", games),
  });

  // Side-step fetch if the cache knows best
  if (cache && cachedResults) {
    return [cachedResults, false];
  }

  return [data, isLoading];
}
