import _ from "lodash";
import { homedir } from "os";
import { useCallback, useEffect, useState } from "react";
import { readFile } from "simple-plist";
import { promisify } from "util";
import { Bookmark, BookmarkPListResult, GeneralBookmark, ReadingListBookmark } from "../types";
import { getUrlDomain } from "../utils";

export const readPlist = promisify(readFile);

export const PLIST_PATH = `${homedir()}/Library/Safari/Bookmarks.plist`;

export function extractReadingListBookmarks(
  bookmarks: BookmarkPListResult,
  readingListOnly?: boolean,
): (ReadingListBookmark | GeneralBookmark)[] {
  if (readingListOnly) {
    return _.chain(bookmarks.Children)
      .find(["Title", "com.apple.ReadingList"])
      .thru((res) => res.Children as Bookmark[])
      .map((res) => ({
        uuid: res.WebBookmarkUUID,
        url: res.URLString,
        domain: getUrlDomain(res.URLString),
        title: res.ReadingListNonSync?.Title || res.URIDictionary.title,
        dateAdded: res.ReadingList.DateAdded,
        dateLastViewed: res.ReadingList.DateLastViewed,
        description: res.ReadingList.PreviewText || "",
      }))
      .orderBy("dateAdded", "desc")
      .value();
  }

  const flattenBookmarks = (
    node:
      | BookmarkPListResult
      | {
          Title: string;
          Children: Bookmark[] | BookmarkPListResult;
        },
    parent?:
      | BookmarkPListResult
      | {
          Title: string;
          Children: Bookmark[] | BookmarkPListResult;
        },
  ) => {
    const arr: GeneralBookmark[] = [];
    if ("Title" in node && node.Title == "com.apple.ReadingList") {
      // Ignore reading list items
    } else {
      if ("Children" in node) {
        (node.Children as []).forEach((child) => arr.push(...flattenBookmarks(child, node)));
      } else if ((node as Bookmark).WebBookmarkType == "WebBookmarkTypeLeaf") {
        const res = node as Bookmark;
        const resParent = parent as BookmarkPListResult;
        arr.push({
          uuid: res.WebBookmarkUUID,
          url: res.URLString,
          domain: getUrlDomain(res.URLString),
          title: "Title" in res ? (res.Title as string) : res.URIDictionary.title,
          folder: resParent.Title,
        });
      }
    }
    return arr;
  };

  return _.chain(flattenBookmarks(bookmarks)).value() as GeneralBookmark[];
}

export default function useBookmarks(readingListOnly?: boolean) {
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
}
