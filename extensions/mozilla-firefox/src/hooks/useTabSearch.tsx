import { existsSync, promises } from "fs";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, SearchResult, Tab } from "../interfaces";
import { decodeLZ4, getSessionActivePath, getSessionInactivePath } from "../util";
import { NOT_INSTALLED_MESSAGE } from "../constants";
import { NotInstalledError, UnknownError } from "../components";

const decompressSession = async (): Promise<any> => {
  let sessionPath = await getSessionInactivePath();
  if (existsSync(sessionPath)) {
    sessionPath = await getSessionActivePath();
  }
  if (existsSync(sessionPath)) {
    throw new Error("No profile session file found.");
  }
  const fileBuffer = await promises.readFile(sessionPath);
  return decodeLZ4(fileBuffer);
};

export function useTabSearch(query?: string): SearchResult<Tab> {
  const { tabSessionManagerId } = getPreferenceValues<Preferences>();
  const [data, setData] = useState<Tab[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorView, setErrorView] = useState<ReactNode | undefined>();

  const getTabs = useCallback(async () => {
    let tabs: Tab[] = [];

    if (tabSessionManagerId) {
    } else {
      const session = await decompressSession();
      tabs = session.windows
        .map((w: any) => w.tabs.map((t: any) => t.entries.map((e: any) => ({ url: e.url, title: e.title }))[0]))
        .flat(2)
        .filter((t: Tab) => t.url !== "about:newtab")
        .map((e: any) => Tab.parse(e));
    }

    if (query) {
      tabs = tabs.filter(
        (tab) =>
          tab.title.toLowerCase().includes(query.toLowerCase()) ||
          tab.urlWithoutScheme().toLowerCase().includes(query.toLowerCase())
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

  return { data, isLoading, errorView };
}
