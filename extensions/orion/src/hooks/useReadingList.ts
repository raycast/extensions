import { useCallback, useEffect, useState } from "react";
import { parseFileSync } from "bplist-parser";

import { Bookmark, OrionReadingListItem, OrionReadingListPlistResult } from "../types";
import { getReadingListPath } from "src/utils";


const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>();
  const readingListPath = getReadingListPath();

  const fetchItems = useCallback(async () => {
    const bookmarksPlist = parseFileSync(readingListPath) as OrionReadingListPlistResult;
    const items = bookmarksPlist[0];
    const bookmarks = parseBookmarks(items);
    setBookmarks(bookmarks);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { bookmarks };
};

function parseBookmarks(items: OrionReadingListItem[]) {
  return items
    .filter((item) => !!item.url)
    .map((oBookmark) => {
      const bookmark: Bookmark = {
        uuid: oBookmark.id,
        title: oBookmark.title,
        url: oBookmark.url.relative,
        dateAdded: oBookmark.dateAdded,
        imageUrl: oBookmark.imageUrl?.relative,
        folders: [],
      };
      return bookmark;
    });
}

export default useBookmarks;
