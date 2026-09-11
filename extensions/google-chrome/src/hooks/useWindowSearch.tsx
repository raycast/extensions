import { ReactNode, useEffect, useState } from "react";
import { getOpenWindows } from "../actions";
import { NOT_INSTALLED_MESSAGE } from "../constants";
import { NotInstalledError, UnknownError } from "../components";
import { usePromise } from "@raycast/utils";

const WINDOW_REFRESH_INTERVAL_MS = 2000;

export function useWindowSearch(searchText = "") {
  const [errorView, setErrorView] = useState<ReactNode | undefined>();

  const {
    isLoading,
    data: windowData,
    mutate,
    revalidate,
  } = usePromise(
    async () => {
      const windows = await getOpenWindows();
      setErrorView(undefined);
      return windows;
    },
    [],
    {
      onError(error) {
        setErrorView((current) => {
          if (current) {
            return current;
          }
          if (error.message === NOT_INSTALLED_MESSAGE) {
            return <NotInstalledError />;
          }
          return <UnknownError />;
        });
      },
    },
  );

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const intervalId = setInterval(revalidate, WINDOW_REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isLoading, revalidate]);

  const rawData = windowData || [];
  const data = searchText
    ? rawData.filter((win) => win.title.toLowerCase().includes(searchText.toLowerCase()))
    : rawData;

  return { data, isLoading: isLoading && windowData === undefined, errorView, mutate };
}
