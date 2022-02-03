import _ from "lodash";
import { homedir } from "os";
import { useCallback, useEffect, useState } from "react";
import { readFile } from "simple-plist";
import { promisify } from "util";

import { BookmarkPListResult, ReadingListBookmark } from "../types";
import { getUrlDomain } from "../utils";

const readPlist = promisify(readFile);

const PLIST_PATH = `${homedir()}/Library/Safari/Bookmarks.plist`;

const extractReadingListBookmarks = (bookmarks: BookmarkPListResult): ReadingListBookmark[] =>
  _.chain(bookmarks.Children)
    .find(["Title", "com.apple.ReadingList"])
    .thru((res) => res.Children)
    .map((res) => ({
      uuid: res.WebBookmarkUUID,
      url: res.URLString,
      domain: getUrlDomain(res.URLString),
      title: res.ReadingListNonSync.Title || res.URIDictionary.title,
      dateAdded: res.ReadingList.DateAdded,
      dateLastViewed: res.ReadingList.DateLastViewed,
      description: res.ReadingList.PreviewText || "",
    }))
    .orderBy("dateAdded", "desc")
    .value();

const useBookmarks = () => {
  const [hasPermission, setHasPermission] = useState(true);
  const [bookmarks, setBookmarks] = useState<ReadingListBookmark[]>();

  const fetchItems = useCallback(async () => {
    try {
      const safariBookmarksPlist = (await readPlist(PLIST_PATH)) as BookmarkPListResult;
      const bookmarks = extractReadingListBookmarks(safariBookmarksPlist);
      setBookmarks(bookmarks);
    } catch (err) {
      if (err instanceof Error && err.message.includes("operation not permitted")) {
        setHasPermission(false);
        return;
      }

      throw err;
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { bookmarks, hasPermission };
};

export default useBookmarks;
