import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

import { getPreferenceValues } from "@raycast/api";

import { getOpenTabs } from "../actions";
import { NotInstalledError, UnknownError } from "../components";
import { NOT_INSTALLED_MESSAGE } from "../constants";
import type { Preferences, SearchResult, Tab } from "../interfaces";

export function useTabSearch(query?: string): SearchResult<Tab> {
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();
  const [data, setData] = useState<Tab[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorView, setErrorView] = useState<ReactNode | undefined>();

  const getTabs = useCallback(async () => {
    let tabs = await getOpenTabs(useOriginalFavicon);

    if (query) {
      tabs = tabs.filter(
        (tab) =>
          tab.title.toLowerCase().includes(query.toLowerCase()) ||
          tab.urlWithoutScheme().toLowerCase().includes(query.toLowerCase()),
      );
    }
    setData(tabs);
  }, [query]);

  useEffect(() => {
    getTabs()
      .then(() => setIsLoading(false))
      .catch((e) => {
        if (e.message === NOT_INSTALLED_MESSAGE) {
          setErrorView(<NotInstalledError />);
        } else {
          setErrorView(<UnknownError />);
        }
        setIsLoading(false);
      });
  }, [query]);

  return { data, isLoading, errorView, revalidate: getTabs, profile: { name: "", id: "" } };
}
