import { LocalStorage } from "@raycast/api";
import { LinkdingBookmark } from "../types/linkding-types";

const LOCAL_STORAGE_KEY = "linkding-bookmarks";

export const saveBookmarksToCache = async (bookmarks: LinkdingBookmark[]) => {
  await LocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bookmarks));
};

export const getCachedBookmarks = async () => {
  const cachedBookmarks = await LocalStorage.getItem(LOCAL_STORAGE_KEY);
  if (typeof cachedBookmarks === "string") {
    return JSON.parse(cachedBookmarks);
  }
  return [];
};
