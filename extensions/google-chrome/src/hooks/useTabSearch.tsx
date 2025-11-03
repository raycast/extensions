import { ReactNode, useState } from "react";
import { getOpenTabs } from "../actions";
import { Preferences, SearchResult, Tab } from "../interfaces";
import { getPreferenceValues } from "@raycast/api";
import { NOT_INSTALLED_MESSAGE } from "../constants";
import { NotInstalledError, UnknownError } from "../components";
import { usePromise } from "@raycast/utils";
import { parseSearchQuery, matchesQuery } from "../util/search-parser";

/**
 * @name useTabSearch
 * @description Filters chrome tabs where the url and title match all tab-or-space-separated words in search query (case insensitive).
 * Supports exclude terms with "/" prefix to filter out results containing those terms.
 * @example Given title "foo bar" with url "example.com":
 * search "foo bar" succeeds
 * search "bar foo" succeeds
 * search "foo example" succeeds
 * search "example foo" succeeds
 * search "foo" succeeds
 * search "example" succeeds
 * search "foo /bar" succeeds (contains foo but not bar)
 * search "/example" fails (excludes example.com)
 * search "asdf" fails
 */
export function useTabSearch(query = ""): SearchResult<Tab> & { data: NonNullable<Tab[]> } {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();

  const [errorView, setErrorView] = useState<ReactNode | undefined>();
  const [isEmpty, setIsEmpty] = useState<boolean>(false);

  const { isLoading, data: tabData } = usePromise(
    async (useOriginalFavicon: boolean, query: string) => {
      const tabs = await getOpenTabs(useOriginalFavicon);
      const parsedQuery = parseSearchQuery(query);
      setErrorView(undefined);
      setIsEmpty(tabs.length === 0);

      // Early return if no search query
      if (parsedQuery.includeTerms.length === 0 && parsedQuery.excludeTerms.length === 0) {
        return tabs;
      }

      return tabs.filter((tab) => {
        try {
          const searchable = `${tab.title.toLowerCase()} ${tab.urlWithoutScheme().toLowerCase()}`;
          return matchesQuery(searchable, parsedQuery);
        } catch {
          // Handle invalid URLs gracefully
          const searchable = `${tab.title.toLowerCase()} ${tab.url.toLowerCase()}`;
          return matchesQuery(searchable, parsedQuery);
        }
      });
    },
    [useOriginalFavicon, query],
    {
      onError(error) {
        if (error.message === NOT_INSTALLED_MESSAGE) {
          setErrorView(<NotInstalledError />);
        } else {
          setErrorView(<UnknownError />);
        }
      },
    },
  );

  const data = isEmpty ? [] : tabData || [];

  return { data, isLoading, errorView };
}
