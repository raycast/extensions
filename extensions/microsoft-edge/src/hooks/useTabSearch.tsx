import { ReactNode, useCallback, useEffect, useState } from "react";
import { getOpenTabs } from "../actions";
import { SearchResult, Tab } from "../types/interfaces";
import { NotInstalledError, UnknownError } from "../components";
import { geNotInstalledMessage } from "../utils/messageUtils";

const getTabs = async (_profile?: string, query?: string) => {
  let tabs = await getOpenTabs();

  if (query) {
    tabs = tabs.filter(function (tab) {
      return (
        tab.title.toLowerCase().includes(query.toLowerCase()) ||
        tab.urlWithoutScheme().toLowerCase().includes(query.toLowerCase())
      );
    });
  }
  return tabs;
};

export function useTabSearch(query?: string): SearchResult<Tab> {
  const [data, setData] = useState<Tab[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorView, setErrorView] = useState<ReactNode | undefined>();
  const [profile, setProfile] = useState<string>();

  const revalidate = useCallback(
    (profileId: string) => {
      setProfile(profileId);
    },
    [profile],
  );

  useEffect(() => {
    getTabs(profile, query)
      .then((tabs) => {
        setData(tabs);
        setIsLoading(false);
      })
      .catch((e) => {
        if (e.message === geNotInstalledMessage()) {
          setErrorView(<NotInstalledError />);
        } else {
          setErrorView(<UnknownError />);
        }
        setIsLoading(false);
      });
  }, [query, profile]);

  return { data, isLoading, errorView, revalidate };
}
