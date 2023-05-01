import { homedir } from "os";
import { promisify } from "util";

import { useCachedPromise } from "@raycast/utils";
import { readFile } from "simple-plist";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";

const PLIST_PATH = `${homedir()}/Library/Safari/Bookmarks.plist`;

const readPlist = promisify(readFile);

export type BookmarkPListResult = {
  Children: (BookmarkFolder | ReadingList)[];
};

export type BookmarkFolder = {
  WebBookmarkUUID: string;
  Title: string;
  Children?: (BookmarkFolder | BookmarkItem)[];
  WebBookmarkType: "WebBookmarkTypeList";
};

export type BookmarkItem = {
  WebBookmarkUUID: string;
  ReadingListNonSync: {
    Title?: string;
  };
  URLString: string;
  WebBookmarkType: "WebBookmarkTypeLeaf";
  URIDictionary: {
    title: string;
  };
  imageURL?: string;
};

export type ReadingList = {
  WebBookmarkUUID: string;
  Title: string;
  WebBookmarkType: "WebBookmarkTypeList";
  Children?: ReadingListItem[];
};

export type ReadingListItem = BookmarkItem & {
  ReadingList: {
    DateAdded: string;
    DateLastViewed?: string;
    PreviewText: string;
  };
};

function getBookmarks(bookmark: BookmarkFolder | BookmarkItem, hierarchy = "") {
  const bookmarks = [];

  if (bookmark.WebBookmarkType === "WebBookmarkTypeList") {
    bookmark.Children?.map((child) => {
      bookmarks.push(...getBookmarks(child, hierarchy === "" ? "Favourites" : `${hierarchy}/${bookmark.Title}`));
    });
  }

  if (bookmark.WebBookmarkType === "WebBookmarkTypeLeaf") {
    bookmarks.push({
      id: bookmark.WebBookmarkUUID,
      title: bookmark.URIDictionary.title,
      url: bookmark.URLString,
      folder: hierarchy,
    });
  }

  return bookmarks;
}

type Folder = {
  id: string;
  icon: string;
  title: string;
};

function getFolders(bookmark: BookmarkFolder | BookmarkItem, hierarchy = ""): Folder[] {
  const folders: Folder[] = [];

  if (bookmark.WebBookmarkType === "WebBookmarkTypeList") {
    const title = hierarchy === "" ? "Favourites" : `${hierarchy}/${bookmark.Title}`;

    return [
      { title, id: bookmark.WebBookmarkUUID, icon: "safari.png" },
      ...(bookmark.Children?.map((child) => getFolders(child, title)) || []).flat(),
    ];
  }

  return folders;
}

export default function useSafariBookmarks(enabled: boolean) {
  const {
    data: plist,
    isLoading,
    mutate,
    error,
  } = useCachedPromise(
    (enabled) => {
      return enabled ? (readPlist(PLIST_PATH) as Promise<BookmarkPListResult>) : Promise.resolve();
    },
    [enabled]
  );

  const bookmarksBar = plist?.Children?.find((bookmark) => bookmark.Title === "BookmarksBar");

  const bookmarks = bookmarksBar ? getBookmarks(bookmarksBar) : [];
  const folders = bookmarksBar ? getFolders(bookmarksBar) : [];

  const readingList = plist?.Children?.find((bookmark) => bookmark.Title === "com.apple.ReadingList") as
    | ReadingList
    | undefined;

  const readingListBookmarks =
    readingList?.Children?.sort((itemA, itemB) => {
      const dateA = new Date(itemA.ReadingList.DateAdded);
      const dateB = new Date(itemB.ReadingList.DateAdded);
      return dateB.getTime() - dateA.getTime();
    }).map((item) => {
      return {
        id: item.WebBookmarkUUID,
        title: item.ReadingListNonSync.Title || item.URIDictionary.title,
        url: item.URLString,
        imageURL: item.imageURL,
        folder: "Reading List",
      };
    }) || [];

  if (readingListBookmarks.length > 0) {
    bookmarks.push(...readingListBookmarks);
    folders.push({ title: "Reading List", id: "reading-list", icon: "safari.png" });
  }

  return {
    bookmarks: bookmarks.map((bookmark) => {
      return {
        ...bookmark,
        browser: BROWSERS_BUNDLE_ID.safari,
      };
    }),
    folders: folders.map((folder) => {
      return {
        ...folder,
        browser: BROWSERS_BUNDLE_ID.safari,
      };
    }),
    isLoading,
    mutate,
    error,
  };
}
