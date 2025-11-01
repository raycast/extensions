import { HistoryEntry, SearchResult } from "../interfaces";
import { ReactNode, useState } from "react";
import { NO_BOOKMARKS_MESSAGE, NOT_INSTALLED_MESSAGE } from "../constants";
import { NotInstalledError, UnknownError } from "../components";
import { getBookmarks } from "../util";
import { usePromise } from "@raycast/utils";

export function useBookmarkSearch(
  profile: string,
  query?: string,
): Required<SearchResult<HistoryEntry> & { readonly errorView: ReactNode }> {
  const [isEmpty, setIsEmpty] = useState<boolean>(false);
  const [errorView, setErrorView] = useState<ReactNode>();

  const {
    isLoading,
    data: bookmarkData,
    revalidate,
  } = usePromise(
    (profile: string, query?: string) =>
      getBookmarks(profile).then((bookmarks) => {
        setErrorView(undefined);
        setIsEmpty(bookmarks.length === 0);
        return bookmarks.filter(
          (bookmark) =>
            bookmark.title.toLowerCase().includes(query?.toLowerCase() || "") ||
            bookmark.url.toLowerCase().includes(query?.toLowerCase() || ""),
        );
      }),
    [profile, query],
    {
      onError(error) {
        if (error.message === NOT_INSTALLED_MESSAGE) {
          setErrorView(<NotInstalledError />);
        } else if (error.message === NO_BOOKMARKS_MESSAGE) {
          setIsEmpty(true);
        } else {
          setErrorView(<UnknownError />);
        }
      },
    },
  );

  const data = isEmpty ? [] : bookmarkData || [];

  return { errorView, isLoading, data, revalidate };
}
