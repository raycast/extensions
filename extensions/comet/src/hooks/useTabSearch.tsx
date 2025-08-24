import { ReactNode, useEffect, useState } from "react";
import { getOpenTabs } from "../actions";
import { Preferences, SearchResult, Tab } from "../interfaces";
import { getPreferenceValues } from "@raycast/api";
import { NOT_INSTALLED_MESSAGE } from "../constants";
import { NotInstalledError, UnknownError } from "../components";
import { useCometInstallation } from "./useCometInstallation";

/**
 * @name useTabSearch
 * @description Filters comet tabs where the url and title match all tab-or-space-separated words in search query (case insensitive).  Examples given title "foo bar" with url "example.com":
 * @example Given title "foo bar" with url "example.com":
 * search "foo bar" succeeds
 * search "bar foo" succeeds
 * search "foo example" succeds
 * search "example foo" succeds
 * search "foo" succeeds
 * search "example" succeeds
 * search "asdf" fails
 */
export function useTabSearch(query = ""): SearchResult<Tab> & { data: NonNullable<Tab[]>; revalidate?: () => void } {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();
  const [data, setData] = useState<Tab[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorView, setErrorView] = useState<ReactNode | undefined>();
  const { isInstalled, isChecking } = useCometInstallation();
  const queryParts = query.toLowerCase().split(/\s+/);

  const loadTabs = async () => {
    // Wait for installation check to complete
    if (isChecking) {
      setIsLoading(true);
      return;
    }

    if (!isInstalled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const tabs = await getOpenTabs(useOriginalFavicon);
      const filteredTabs = tabs
        .map((tab): [Tab, string] => [tab, `${tab.title.toLowerCase()} ${tab.urlWithoutScheme().toLowerCase()}`])
        .filter(([, searchable]) => queryParts.reduce((isMatch, part) => isMatch && searchable.includes(part), true))
        .map(([tab]) => tab);

      setData(filteredTabs);
      setIsLoading(false);
    } catch (e) {
      if (e instanceof Error && e.message === NOT_INSTALLED_MESSAGE) {
        setErrorView(<NotInstalledError />);
      } else {
        setErrorView(<UnknownError />);
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTabs();
  }, [query, isInstalled, isChecking]);

  const revalidate = () => {
    setIsLoading(true);
    loadTabs();
  };

  return { data, isLoading, errorView, revalidate };
}
