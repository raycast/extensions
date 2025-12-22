import { ReactNode, useState } from "react";
import { SearchResult, Tab } from "../interfaces";
import { NOT_INSTALLED_MESSAGE } from "../constants";
import { usePromise } from "@raycast/utils";
import { matchesQuery, parseSearchQuery } from "../util/util";
import { getOpenTabs } from "../actions";
import { NotInstalledError } from "../components/not-installed-error";
import { UnknownError } from "../components/unknown-error";

export function useTabSearch(query = ""): SearchResult<Tab> & { data: NonNullable<Tab[]> } {
  const [errorView, setErrorView] = useState<ReactNode | undefined>();
  const [isEmpty, setIsEmpty] = useState<boolean>(false);

  const { isLoading, data: tabData } = usePromise(
    async (query: string) => {
      const tabs = await getOpenTabs();
      const parsedQuery = parseSearchQuery(query);
      setErrorView(undefined);
      setIsEmpty(tabs.length === 0);

      if (parsedQuery.includeTerms.length === 0 && parsedQuery.excludeTerms.length === 0) {
        return tabs;
      }

      return tabs.filter((tab) => {
        try {
          const searchable = `${tab.title.toLowerCase()} ${tab.urlWithoutScheme().toLowerCase()}`;
          return matchesQuery(searchable, parsedQuery);
        } catch {
          const searchable = `${tab.title.toLowerCase()} ${tab.url.toLowerCase()}`;
          return matchesQuery(searchable, parsedQuery);
        }
      });
    },
    [query],
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
