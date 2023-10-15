import { homedir } from "os";
import { useCallback, useEffect, useState } from "react";
import { parseFileSync } from "bplist-parser";

import { Bookmark, OrionFavoriteItem, OrionFavoritesPlistResult } from "../types";
import { unique } from "../utils";
import { join } from "path";
import { showToast, Toast } from "@raycast/api";

const FAVORITES_PATH = join(homedir(), "/Library/Application Support/Orion/Defaults/favourites.plist");

const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);

    try {
      const bookmarksPlist = parseFileSync(FAVORITES_PATH) as OrionFavoritesPlistResult;
      const items = Object.values(bookmarksPlist[0]);
      const folders = parseFolderNames(Object.values(bookmarksPlist[0]));
      const bookmarks = parseBookmarks(items, folders);
      setBookmarks(bookmarks);
      setFolders(Array.from(folders.values()));
      setLoading(false);
    } catch (e) {
      await showToast(Toast.Style.Failure, "Error loading bookmarks", "Be sure to run Orion at least once.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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
