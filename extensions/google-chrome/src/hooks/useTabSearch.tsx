import { ReactNode, useMemo, useState } from "react";
import { getOpenTabs } from "../actions";
import { Preferences, Tab } from "../interfaces";
import { getPreferenceValues } from "@raycast/api";
import { AUTOMATION_PERMISSION_MESSAGE, NOT_INSTALLED_MESSAGE } from "../constants";
import { AutomationPermissionError, NotInstalledError, UnknownError } from "../components";
import { usePromise } from "@raycast/utils";
import { parseSearchQuery, matchesQuery } from "../util/search-parser";

export interface TabSearchResult {
  readonly data: Tab[];
  readonly isLoading: boolean;
  readonly errorView?: ReactNode;
  readonly revalidate: () => void;
}

/**
 * @name useTabSearch
 * Hook to search Chrome tabs using the search parser.
 * See parseSearchQuery() in search-parser.ts for detailed search syntax and examples.
 */
export function useTabSearch(query = ""): TabSearchResult {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();

  const [errorView, setErrorView] = useState<ReactNode | undefined>();

  const {
    isLoading,
    data: tabs,
    revalidate,
  } = usePromise(
    async (useOriginalFavicon: boolean) => {
      const tabs = await getOpenTabs(useOriginalFavicon);
      setErrorView(undefined);
      return tabs;
    },
    [useOriginalFavicon],
    {
      onError(error) {
        console.error("Failed to read Google Chrome tabs:", error);
        if (error.message === NOT_INSTALLED_MESSAGE) {
          setErrorView(<NotInstalledError />);
        } else if (error.message === AUTOMATION_PERMISSION_MESSAGE) {
          setErrorView(<AutomationPermissionError />);
        } else {
          setErrorView(<UnknownError message={error.message} />);
        }
      },
    },
  );

  const data = useMemo(() => filterTabs(tabs ?? [], query), [tabs, query]);

  return { data, isLoading, errorView, revalidate };
}

function filterTabs(tabs: Tab[], query: string): Tab[] {
  const parsedQuery = parseSearchQuery(query);

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
}
