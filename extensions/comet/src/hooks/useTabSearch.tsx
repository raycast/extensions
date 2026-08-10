import { ReactNode, useEffect, useState, useMemo } from "react";
import { getOpenTabs } from "../actions";
import { SearchResult, Tab } from "../interfaces";
import { getPreferenceValues } from "@raycast/api";
import { NOT_INSTALLED_MESSAGE, MAX_TAB_RESULTS } from "../constants";
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
  const [allTabs, setAllTabs] = useState<Tab[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorView, setErrorView] = useState<ReactNode | undefined>();
  const { isInstalled, isChecking } = useCometInstallation();
  const queryParts = query.toLowerCase().split(/\s+/);

  // Memoize filtered tabs to prevent unnecessary re-computation
  const data = useMemo(() => {
    const filteredTabs = allTabs
      .map((tab): [Tab, string] => [tab, `${tab.title.toLowerCase()} ${tab.urlWithoutScheme().toLowerCase()}`])
      .filter(([, searchable]) => queryParts.reduce((isMatch, part) => isMatch && searchable.includes(part), true))
      .map(([tab]) => tab)
      .slice(0, MAX_TAB_RESULTS); // Limit results to prevent memory issues

    return filteredTabs;
  }, [allTabs, queryParts]);

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
      // Apply limit immediately to prevent memory issues with large tab collections
      setAllTabs(tabs.slice(0, MAX_TAB_RESULTS * 2)); // Allow some buffer for filtering
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
  }, [isInstalled, isChecking]); // Remove query dependency since filtering is now memoized

  const revalidate = () => {
    setIsLoading(true);
    loadTabs();
  };

  return { data, isLoading, errorView, revalidate };
}
