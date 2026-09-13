import { ReactNode, useMemo, useState } from "react";
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

  // The tab list is read from Chrome once per command run. `query` is deliberately
  // not a dependency here: filtering happens in memory below, so typing never
  // re-runs the AppleScript.
  const { isLoading, data: tabData } = usePromise(
    async (useOriginalFavicon: boolean) => {
      const tabs = await getOpenTabs(useOriginalFavicon);
      setErrorView(undefined);
      return tabs;
    },
    [useOriginalFavicon],
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

  // Lowercasing is done once per tab list rather than on every keystroke.
  const searchableTabs = useMemo(
    () =>
      (tabData ?? []).map((tab) => {
        let searchable: string;
        try {
          searchable = `${tab.title.toLowerCase()} ${tab.urlWithoutScheme().toLowerCase()}`;
        } catch {
          // Handle invalid URLs gracefully
          searchable = `${tab.title.toLowerCase()} ${tab.url.toLowerCase()}`;
        }
        return { tab, searchable };
      }),
    [tabData],
  );

  const data = useMemo(() => {
    const parsedQuery = parseSearchQuery(query);

    // Early return if no search query
    if (parsedQuery.includeTerms.length === 0 && parsedQuery.excludeTerms.length === 0) {
      return searchableTabs.map(({ tab }) => tab);
    }

    return searchableTabs.filter(({ searchable }) => matchesQuery(searchable, parsedQuery)).map(({ tab }) => tab);
  }, [searchableTabs, query]);

  return { data, isLoading, errorView };
}
