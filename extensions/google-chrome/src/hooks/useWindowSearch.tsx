import { ReactNode, useState } from "react";
import { getOpenWindows } from "../actions";
import { NOT_INSTALLED_MESSAGE } from "../constants";
import { NotInstalledError, UnknownError } from "../components";
import { usePromise } from "@raycast/utils";

export function useWindowSearch(searchText = "") {
  const [errorView, setErrorView] = useState<ReactNode | undefined>();

  const {
    isLoading,
    data: windowData,
    mutate,
  } = usePromise(
    async (searchText: string) => {
      const windows = await getOpenWindows();
      setErrorView(undefined);
      if (!searchText) return windows;
      return windows.filter((win) => win.title.toLowerCase().includes(searchText.toLowerCase()));
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

  const data = windowData || [];

  return { data, isLoading, errorView, mutate };
}
