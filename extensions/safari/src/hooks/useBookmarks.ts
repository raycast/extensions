import _ from "lodash";
import { useMemoizedFn } from "ahooks";
import { useEffect, useState } from "react";
import { readFile } from "simple-plist";
import { promisify } from "util";
import { getPreferenceValues } from "@raycast/api";

import { Bookmark, BookmarkPListResult, GeneralBookmark, ReadingListBookmark } from "../types";
import { getUrlDomain } from "../utils";
import { PLIST_PATH } from "../constants";
import { execSync } from "child_process";
import path from "path";

export const readPlist = promisify(readFile);

const { parseBookmarksWithGo } = getPreferenceValues();

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

  const fetchItemsWithGo = useMemoizedFn(() => {
    try {
      const GO_PARSER_PATH = path.join(__dirname, "tools", "bookmarks-parser");
      const result = execSync(`"${GO_PARSER_PATH}" -input "${PLIST_PATH}"`, { encoding: "utf-8" });
      const parsedResult = extractReadingListBookmarks(JSON.parse(result) as BookmarkPListResult);
      setBookmarks(parsedResult);
    } catch (e) {
      console.error("parse bookmarks with err");
      console.error(e);
    }
  });

  const fetchItemsWithPlistNode = useMemoizedFn(async () => {
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
  });

  useEffect(() => {
    if (parseBookmarksWithGo) {
      fetchItemsWithGo();
    } else {
      fetchItemsWithPlistNode();
    }
  }, [fetchItemsWithPlistNode, fetchItemsWithGo]);

  return { bookmarks, hasPermission };
}
