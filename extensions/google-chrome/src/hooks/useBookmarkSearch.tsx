import { HistoryEntry, SearchResult } from "../interfaces";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { NO_BOOKMARKS_MESSAGE, NOT_INSTALLED_MESSAGE } from "../constants";
import { NoBookmarksError, NotInstalledError, UnknownError } from "../components";
import { getBookmarks } from "../util";

export function useBookmarkSearch(
  query?: string,
): Required<SearchResult<HistoryEntry> & { readonly errorView: ReactNode }> {
  const [data, setData] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<string>();
  const [errorView, setErrorView] = useState<ReactNode>();

  const revalidate = useCallback(
    (profileId: string) => {
      setProfile(profileId);
    },
    [profile],
  );

  useEffect(() => {
    getBookmarks(profile)
      .then((bookmarks) => {
        setData(
          bookmarks.filter(
            (bookmark) =>
              bookmark.title.toLowerCase().includes(query?.toLowerCase() || "") ||
              bookmark.url.toLowerCase().includes(query?.toLowerCase() || ""),
          ),
        );
        setIsLoading(false);
      })
      .catch((e) => {
        if (e.message === NOT_INSTALLED_MESSAGE) {
          setErrorView(<NotInstalledError />);
        } else if (e.message === NO_BOOKMARKS_MESSAGE) {
          setErrorView(<NoBookmarksError />);
        } else {
          setErrorView(<UnknownError />);
        }
        setIsLoading(false);
      });
  }, [profile, query]);

  return { errorView, isLoading, data, revalidate };
}
