import { ReactNode, useState } from "react";
import { getOpenWindows } from "../actions";
import { ChromeWindow, SearchResult } from "../interfaces";
import { NOT_INSTALLED_MESSAGE } from "../constants";
import { NotInstalledError, UnknownError } from "../components";
import { usePromise } from "@raycast/utils";

export function useWindowSearch(searchText = ""): SearchResult<ChromeWindow> & { data: NonNullable<ChromeWindow[]> } {
  const [errorView, setErrorView] = useState<ReactNode | undefined>();
  const [isEmpty, setIsEmpty] = useState<boolean>(false);

  const { isLoading, data: windowData } = usePromise(
    async (query: string) => {
      const windows = await getOpenWindows();
      setErrorView(undefined);
      setIsEmpty(windows.length === 0);

      if (!query) {
        return windows;
      }

      const lowerQuery = query.toLowerCase();
      return windows.filter((win) => win.title.toLowerCase().includes(lowerQuery));
    },
    [searchText],
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

  const data = isEmpty ? [] : windowData || [];
  return { data, isLoading, errorView };
}
