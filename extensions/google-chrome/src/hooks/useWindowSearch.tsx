import { ReactNode, useState } from "react";
import { getOpenWindows } from "../actions";
import { ChromeWindow, SearchResult } from "../interfaces";
import { NOT_INSTALLED_MESSAGE } from "../constants";
import { NotInstalledError, UnknownError } from "../components";
import { usePromise } from "@raycast/utils";

export function useWindowSearch(searchText = ""): SearchResult<ChromeWindow> & { data: NonNullable<ChromeWindow[]> } {
  const [errorView, setErrorView] = useState<ReactNode | undefined>();

  const { isLoading, data: windowData } = usePromise(
    async () => {
      const windows = await getOpenWindows();
      setErrorView(undefined);
      return windows;
    },
    [],
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

  const rawData = windowData || [];
  const data = searchText
    ? rawData.filter((win) => win.title.toLowerCase().includes(searchText.toLowerCase()))
    : rawData;

  return { data, isLoading, errorView };
}
