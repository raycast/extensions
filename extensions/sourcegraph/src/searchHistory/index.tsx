import { LaunchProps, LocalStorage, launchCommand, LaunchType } from "@raycast/api";
import { DateTime } from "luxon";

import { Sourcegraph, isSourcegraphDotCom } from "../sourcegraph";

export type SearchHistoryItem = {
  query: string;
  // Timestamp in epoch milliseconds
  timestamp: number;
};

/**
 * Records search history locally on a per-instance basis.
 */
export class SearchHistory {
  private static VERSION = 1;
  private static SEARCH_HISTORY_LIMIT = 50;
  private static LAUNCH_CONTEXT_KEY = "search";

  private static localStorageKey(src: Sourcegraph) {
    return `v${this.VERSION}-${src.instance}`;
  }

  /**
   * Adds a query to the instance's search history record. If the query looks like it may
   * be a progression of the most recent query - i.e. the previous query may be a query
   * that was still being composed - we will replace the previous entry with this a new
   * one.
   */
  static async addSearch(src: Sourcegraph, query: string) {
    const searchHistoryData = await LocalStorage.getItem<string>(this.localStorageKey(src));
    const searchHistory = searchHistoryData ? (JSON.parse(searchHistoryData) as SearchHistoryItem[]) : [];

    const previous = searchHistory.length > 0 ? searchHistory[0] : undefined;
    if (previous) {
      // Remove previous search if it is an exact prefix or exact suffix of this search -
      // adding to the start and end of a query is the most common way to update a query
      // in a way that indicates the previous query was just a query that is still being
      // composed.
      if (query.startsWith(previous.query) || query.endsWith(previous.query)) {
        searchHistory.shift();
      }
    }

    // Push this search to top
    searchHistory.unshift({
      query: query,
      timestamp: DateTime.now().toMillis(),
    });

    await LocalStorage.setItem(
      this.localStorageKey(src),
      // Cap the search history size
      JSON.stringify(
        searchHistory.length > this.SEARCH_HISTORY_LIMIT
          ? searchHistory.slice(0, this.SEARCH_HISTORY_LIMIT)
          : searchHistory,
      ),
    );
  }

  /**
   * Loads recorded search history for the instance.
   */
  static async loadHistory(src: Sourcegraph): Promise<SearchHistoryItem[]> {
    const searchHistoryData = await LocalStorage.getItem<string>(this.localStorageKey(src));
    if (!searchHistoryData) {
      return [];
    }
    return JSON.parse(searchHistoryData) as SearchHistoryItem[];
  }

  /**
   * Removes all history entries for this instance.
   */
  static async clearHistory(src: Sourcegraph) {
    await LocalStorage.removeItem(this.localStorageKey(src));
  }

  /**
   * Remove a specific item from this instance's search history.
   */
  static async removeItem(src: Sourcegraph, item: SearchHistoryItem) {
    const history = await this.loadHistory(src);
    const removeIndex = history.findIndex((v) => v.query == item.query && v.timestamp == item.timestamp);
    if (removeIndex >= 0) {
      history.splice(removeIndex, 1);
      await LocalStorage.setItem(this.localStorageKey(src), JSON.stringify(history));
    }
  }

  /**
   * Launches a search for the item.
   */
  static async launchSearch(src: Sourcegraph, item: SearchHistoryItem) {
    return launchCommand({
      name: isSourcegraphDotCom(src.instance) ? "searchDotCom" : "searchInstance",
      type: LaunchType.UserInitiated,
      context: {
        [this.LAUNCH_CONTEXT_KEY]: item,
      },
    });
  }

  /**
   * Loads item from a launch.
   */
  static fromLaunchProps(props: LaunchProps): SearchHistoryItem | undefined {
    if (props.launchContext) {
      const launchSearch = props.launchContext[this.LAUNCH_CONTEXT_KEY] as SearchHistoryItem;
      if (launchSearch) {
        return launchSearch;
      }
    }
    return;
  }
}
