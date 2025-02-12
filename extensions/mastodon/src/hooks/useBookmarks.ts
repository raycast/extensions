import { useCallback, useEffect, useState } from "react";
import { Toast, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { getAccessToken } from "../utils/oauth";
import { MastodonError, Status } from "../utils/types";
import { errorHandler } from "../utils/helpers";
import apiServer from "../utils/api";

export function useBookmark() {
  const [bookmarks, setBookmarks] = useCachedState<Status[]>("latest_bookmarks");
  const [isLoading, setIsLoading] = useState(true);

  const getBookmarks = useCallback(async () => {
    try {
      await getAccessToken();
      showToast(Toast.Style.Animated, "Loading bookmarks..");
      const newBookmarks = await apiServer.fetchBookmarks();
      setBookmarks(newBookmarks);
      showToast(Toast.Style.Success, "Bookmarks loaded");
    } catch (error) {
      errorHandler(error as MastodonError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    getBookmarks();
  }, []);

  return {
    bookmarks,
    isLoading,
  };
}
