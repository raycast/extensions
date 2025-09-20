import { GameSummary, SearchRequest } from "../models";
import { useFetch } from "@raycast/utils";
import { parseGameSummaries } from "./utilities";
import { useExpiringCache } from "./UseExpiringCache";
import { LUNA_API_ROUTE, MIN_SEARCH_LENGTH } from "../constants";

/**
 * The configuration object for the useFetch hook when performing a search query,
 * including the initial data, response parsing, and HTTP method.
 */
const QUERY_CONFIG = {
  initialData: [],
  method: "POST",
  parseResponse: (response: Response) => parseGameSummaries(WIDGET_ID, response),
};

/**
 * The ID of the widget that contains the game summaries in the Luna API response.
 */
const WIDGET_ID = "collection_grid_search";

/**
 * Determines whether the search input is executable, which means it has a length of at least MIN_SEARCH_LENGTH characters.
 *
 * @param search The search input string.
 * @returns true if the search input is executable, false otherwise.
 */
function isExecutable(search?: string) {
  if (!search) {
    return false;
  }
  return search.length >= MIN_SEARCH_LENGTH;
}

/**
 * Determines if strings are related to each other.
 * @param a first string to consider
 * @param b second string to consider
 * @returns true if the strings have the same base.
 */
function isRelated(a: string, b: string) {
  return a.substring(0, MIN_SEARCH_LENGTH) === b.substring(0, MIN_SEARCH_LENGTH);
}

/**
 * A custom React hook that fetches the game summaries based on the provided search query,
 * using an expiring cache to optimize the fetch requests.
 *
 * @param search The search query to use for fetching the game summaries.
 * @returns A tuple containing the array of GameSummary instances and a boolean indicating whether the data is currently being loaded.
 */
export function useSearch(search?: string, previousSearch?: string): [GameSummary[], isLoading: boolean] {
  const [cache] = useExpiringCache<GameSummary[]>();
  const cachedResults = search && isExecutable(search) ? cache?.get(search ?? "") : undefined;
  const { body, headers } = new SearchRequest(search ?? "undefined");

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
    // Only keep the previous data if the search is "related" to the previous.
    keepPreviousData: isRelated(search ?? "", previousSearch ?? ""),
    onData: (games) => {
      if (search) {
        cache?.set(search, games);
      }
    },
  });

  // Bail out if the search is nonsense
  if (!search || !isExecutable(search)) {
    return [[], false];
  }

  // Side-step fetch if the cache knows best
  if (cache && cachedResults) {
    return [cachedResults, false];
  }

  return [data, isLoading];
}
