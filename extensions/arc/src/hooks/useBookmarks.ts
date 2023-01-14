import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { BookmarkTab, Tab } from "../types";
export const STORAGE_KEY_FOR_ARC_BOOKMARKS = "arc-bookmarks-storage-key";

export const useBookmarks = () => {
  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    return JSON.parse((await LocalStorage.getItem<string>(STORAGE_KEY_FOR_ARC_BOOKMARKS)) ?? "{}") as BookmarkTab;
  });

  const updateBookmarks = async (savedBookmarks: BookmarkTab, tab: Tab) => {
    const isTabBookmarked = savedBookmarks[tab.url];
    const toastMessage = isTabBookmarked ? "Bookmark removed" : "Bookmarked";

    const updatedBookmarks = {
      ...savedBookmarks,
      [tab.url]: isTabBookmarked ? undefined : tab.title,
    };

    await LocalStorage.setItem(STORAGE_KEY_FOR_ARC_BOOKMARKS, JSON.stringify(updatedBookmarks));
    await showToast({ style: Toast.Style.Success, title: toastMessage });
    revalidate();
  };

  return {
    isBookmarksLoading: isLoading,
    savedBookmarks: data ?? {},
    updateBookmarks,
  };
};
