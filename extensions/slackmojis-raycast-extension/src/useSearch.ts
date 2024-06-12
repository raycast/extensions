import { Toast, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { URLSearchParams } from "node:url";
import { type SearchResults } from "./types";
import { messaging } from "./messaging";
import { extractEmojiId } from "./helpers";

/**
 * Number of items that the API returns per paginated request
 */
const API_PER_PAGE = 24;

/**
 * Slackmojis API base URL for searching
 */
const BASE_URL = "https://slackmojis.com/emojis/search.json";

interface ParsedSearchResult {
  name: string;
  image_url: string;
  id: string;
}

function onSearchError() {
  showToast({
    title: messaging.TOAST_SEARCH_ERROR_TITLE,
    message: messaging.TOAST_SEARCH_ERROR_MESSAGE,
    style: Toast.Style.Failure,
  });
}

function useSearch(query: string) {
  return useFetch(
    // prettier-ignore
    (options) =>
      BASE_URL + "?" +
      new URLSearchParams({ page: String(options.page), query }).toString(),
    {
      mapResult: (result: ParsedSearchResult[]) => {
        return {
          data: result,
          hasMore: result.length === API_PER_PAGE,
        };
      },
      keepPreviousData: true,
      initialData: [],
      parseResponse: async (response: Response) => {
        const json = (await response.json()) as SearchResults;

        if (!response.ok || "message" in json) {
          return Promise.reject(new Error());
        }

        return json.map(
          (emoji): ParsedSearchResult => ({
            id: extractEmojiId(emoji.image_url),
            name: emoji.name,
            image_url: emoji.image_url,
          }),
        );
      },
      // Only execute the fetch when the query is not empty
      execute: query.length > 0,
      onError: onSearchError,
    },
  );
}

export { useSearch, type ParsedSearchResult as SearchResult };
