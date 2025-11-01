import { ReactNode, useState } from "react";
import { getOpenTabs } from "../actions";
import { Preferences, SearchResult, Tab } from "../interfaces";
import { getPreferenceValues } from "@raycast/api";
import { NOT_INSTALLED_MESSAGE } from "../constants";
import { NotInstalledError, UnknownError } from "../components";
import { usePromise } from "@raycast/utils";

/**
 * @name useTabSearch
 * @description Filters chrome tabs where the url and title match all tab-or-space-separated words in search query (case insensitive).  Examples given title "foo bar" with url "example.com":
 * @example Given title "foo bar" with url "example.com":
 * search "foo bar" succeeds
 * search "bar foo" succeeds
 * search "foo example" succeds
 * search "example foo" succeds
 * search "foo" succeeds
 * search "example" succeeds
 * search "asdf" fails
 */
export function useTabSearch(query = ""): SearchResult<Tab> & { data: NonNullable<Tab[]> } {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();

  const [errorView, setErrorView] = useState<ReactNode | undefined>();
  const [isEmpty, setIsEmpty] = useState<boolean>(false);

  const { isLoading, data: tabData } = usePromise(
    (useOriginalFavicon: boolean, query: string) => {
      return getOpenTabs(useOriginalFavicon).then((tabs) => {
        const queryParts = query.toLowerCase().split(/\s+/);
        setErrorView(undefined);
        setIsEmpty(tabs.length === 0);
        return tabs
          .map((tab): [Tab, string] => [tab, `${tab.title.toLowerCase()} ${tab.urlWithoutScheme().toLowerCase()}`])
          .filter(([, searchable]) => queryParts.reduce((isMatch, part) => isMatch && searchable.includes(part), true))
          .map(([tab]) => tab);
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
