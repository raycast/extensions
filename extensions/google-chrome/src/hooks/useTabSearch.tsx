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
 * Hook to search Chrome tabs using the search parser.
 * See parseSearchQuery() in search-parser.ts for detailed search syntax and examples.
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
