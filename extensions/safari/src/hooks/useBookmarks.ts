import _ from "lodash";
import { homedir } from "os";
import { useCallback, useEffect, useState } from "react";
import { readFile } from "simple-plist";
import { promisify } from "util";

import { Bookmark, BookmarkPListResult, GeneralBookmark, ReadingListBookmark } from "../types";
import { getUrlDomain } from "../utils";

const readPlist = promisify(readFile);

const PLIST_PATH = `${homedir()}/Library/Safari/Bookmarks.plist`;

const extractReadingListBookmarks = (
  bookmarks: BookmarkPListResult,
  readingListOnly?: boolean
): (ReadingListBookmark | GeneralBookmark)[] => {
  if (readingListOnly) {
    return _.chain(bookmarks.Children)
      .find(["Title", "com.apple.ReadingList"])
      .thru((res) => res.Children as Bookmark[])
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
  }

  return _.chain(bookmarks.Children)
    .thru((coll) => _.union(coll, (_.map(coll, "Children") as []) || []) as unknown as Bookmark[])
    .flatten()
    .filter((res) => {
      return res != undefined && res.WebBookmarkType == "WebBookmarkTypeLeaf";
    })
    .map((res) => ({
      uuid: res.WebBookmarkUUID,
      url: res.URLString,
      domain: getUrlDomain(res.URLString),
      title: "Title" in res ? res.Title : res.URIDictionary.title,
    }))
    .value() as GeneralBookmark[];
};

const useBookmarks = (readingListOnly?: boolean) => {
  const [hasPermission, setHasPermission] = useState(true);
  const [bookmarks, setBookmarks] = useState<(ReadingListBookmark | GeneralBookmark)[]>();

  const fetchItems = useCallback(async () => {
    try {
      const safariBookmarksPlist = (await readPlist(PLIST_PATH)) as BookmarkPListResult;
      const bookmarks = extractReadingListBookmarks(safariBookmarksPlist, readingListOnly);
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
