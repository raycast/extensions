import { homedir } from "os";
import { promisify } from "util";

import { useCachedPromise } from "@raycast/utils";
import { readFile } from "simple-plist";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";

const PLIST_PATH = `${homedir()}/Library/Safari/Bookmarks.plist`;

const readPlist = promisify(readFile);

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

function getTitle(title: string, hierarchy = "") {
  let formattedTitle = title;
  if (title === "com.apple.ReadingList") {
    formattedTitle = "Reading List";
  } else if (title === "BookmarksBar") {
    formattedTitle = "Favourites";
  } else if (title === "BookmarksMenu") {
    formattedTitle = "Bookmarks Menu";
  }

  return hierarchy === "" ? formattedTitle : `${hierarchy}/${title}`;
}

function getBookmarks(bookmark: BookmarkFolder | BookmarkItem, hierarchy = "") {
  const bookmarks = [];

  if (bookmark.WebBookmarkType === "WebBookmarkTypeList" && bookmark.Children && bookmark.Children.length > 0) {
    bookmark.Children.map((child) => {
      bookmarks.push(...getBookmarks(child, getTitle(bookmark.Title, hierarchy)));
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

  if (bookmark.WebBookmarkType === "WebBookmarkTypeList" && bookmark.Children && bookmark.Children.length > 0) {
    const title = getTitle(bookmark.Title, hierarchy);

    return [
      { title, id: bookmark.WebBookmarkUUID, icon: "safari.png" },
      ...(bookmark.Children?.map((child) => getFolders(child, title)) || []).flat(),
    ];
  }

  return folders;
}

export default function useSafariBookmarks(enabled: boolean) {
  const { data, isLoading, mutate, error } = useCachedPromise(
    (enabled) => {
      return enabled ? (readPlist(PLIST_PATH) as Promise<BookmarkFolder>) : Promise.resolve();
    },
    [enabled],
  );
  const bookmarks = data ? getBookmarks(data) : [];
  const folders = data ? getFolders(data) : [];

  return {
    bookmarks: bookmarks.map((bookmark) => {
      return { ...bookmark, browser: BROWSERS_BUNDLE_ID.safari };
    }),
    folders: folders.map((folder) => {
      return { ...folder, browser: BROWSERS_BUNDLE_ID.safari };
    }),
    isLoading,
    mutate,
    error,
  };
}
