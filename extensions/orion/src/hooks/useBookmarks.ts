import { useEffect, useState } from "react";
import { parseFileSync } from "bplist-parser";

import { Bookmark, OrionFavoriteItem, OrionFavoritesPlistResult } from "../types";
import { getFavoritesPath, unique } from "../utils";
import { showToast, Toast } from "@raycast/api";

const useBookmarks = (selectedProfileId: string) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const bookmarksPath = getFavoritesPath(selectedProfileId);
    setLoading(true);
    try {
      const bookmarksPlist = parseFileSync(bookmarksPath) as OrionFavoritesPlistResult;
      const items = Object.values(bookmarksPlist[0]);
      const folders = parseFolderNames(Object.values(bookmarksPlist[0]));
      const bookmarks = parseBookmarks(items, folders);
      setBookmarks(bookmarks);
      setFolders(Array.from(folders.values()));
      setLoading(false);
    } catch (e) {
      showToast(Toast.Style.Failure, "Error loading bookmarks", "Be sure to run Orion at least once.");
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId]);

  return { folders, bookmarks, isLoading };
};

function parseFolderNames(items: OrionFavoriteItem[]): Map<string, string> {
  return items
    .filter((item) => item.type === "folder")
    .reduce((folders, currentValue) => {
      if (currentValue.title) {
        folders.set(currentValue.id, currentValue.title);
      }
      return folders;
    }, new Map<string, string>());
}

function parseBookmarks(items: OrionFavoriteItem[], folders: Map<string, string>) {
  return items
    .filter((item) => item.type === "bookmark")
    .filter((item) => !!item.url)
    .map((oBookmark) => {
      const folder = folders.get(oBookmark.parentId);
      const bookmark: Bookmark = {
        uuid: oBookmark.id,
        title: oBookmark.title,
        // We've filtered out bookmarks without url by this point
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        url: oBookmark.url!,
        folders: folder ? [folder] : [],
        dateAdded: oBookmark.dateAdded,
      };
      return bookmark;
    })
    .reduce((deduped, current) => {
      const existing = deduped.find((bkmk) => bkmk.title === current.title && bkmk.url === current.url);
      if (existing) {
        existing.folders = unique(existing.folders.concat(current.folders));
      } else {
        deduped.push(current);
      }
      return deduped;
    }, [] as Bookmark[]);
}

export default useBookmarks;
