import { HistoryEntry, SearchResult } from "../interfaces";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { NO_BOOKMARKS_MESSAGE, NOT_INSTALLED_MESSAGE } from "../constants";
import { NoBookmarksError, NotInstalledError, UnknownError } from "../components";
import { getBookmarks } from "../util";
import { useCometInstallation } from "./useCometInstallation";

export function useBookmarkSearch(
  query?: string,
  initialProfile?: string
): Required<SearchResult<HistoryEntry> & { readonly errorView: ReactNode }> {
  const [data, setData] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<string | undefined>(initialProfile);
  const [errorView, setErrorView] = useState<ReactNode>();
  const { isInstalled, isChecking } = useCometInstallation();

  const revalidate = useCallback((profileId: string) => {
    setProfile(profileId);
  }, []);

  useEffect(() => {
    const loadBookmarks = async () => {
      setErrorView(undefined); // Reset error state on each new search

      // Wait for installation check to complete
      if (isChecking) {
        setIsLoading(true);
        return;
      }

      if (!isInstalled) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const bookmarks = await getBookmarks(profile);
        setData(
          bookmarks.filter(
            (bookmark) =>
              bookmark.title.toLowerCase().includes(query?.toLowerCase() || "") ||
              bookmark.url.toLowerCase().includes(query?.toLowerCase() || "")
          )
        );
        setIsLoading(false);
      } catch (e) {
        if (e instanceof Error && e.message === NOT_INSTALLED_MESSAGE) {
          setErrorView(<NotInstalledError />);
        } else if (e instanceof Error && e.message === NO_BOOKMARKS_MESSAGE) {
          setErrorView(<NoBookmarksError onProfileSelected={revalidate} />);
        } else {
          setErrorView(<UnknownError />);
        }
        setIsLoading(false);
      }
    };

    loadBookmarks();
  }, [profile, query, isInstalled, isChecking]);

  return { errorView, isLoading, data, revalidate };
}
