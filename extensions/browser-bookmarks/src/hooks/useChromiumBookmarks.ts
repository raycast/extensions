import { existsSync, readdirSync, readFile } from "fs";
import { promisify } from "util";

import { useCachedPromise, useCachedState, useStreamJSON } from "@raycast/utils";
import { useCallback, useMemo } from "react";

import { Bookmark, fuzzyMatch } from "../helpers/search";

const read = promisify(readFile);

type BookmarkURL = {
  guid: string;
  name: string;
  url: string;
  type: "url";
};

type BookmarkFolder = {
  guid: string;
  name: string;
  type: "folder";
  children: BookmarkItem[];
};

type BookmarkItem = BookmarkURL | BookmarkFolder;

function getBookmarks(bookmark: BookmarkFolder | BookmarkItem, hierarchy = "") {
  const bookmarks = [];

  if (bookmark.type === "folder") {
    bookmark.children?.map((child) => {
      bookmarks.push(...getBookmarks(child, hierarchy === "" ? bookmark.name : `${hierarchy}/${bookmark.name}`));
    });
  }

  if (bookmark.type === "url") {
    bookmarks.push({
      id: bookmark.guid,
      title: bookmark.name,
      url: bookmark.url,
      folder: hierarchy,
    });
  }

  return bookmarks;
}

type Folder = {
  id: string;
  title: string;
};

function getFolders(bookmark: BookmarkFolder | BookmarkItem, hierarchy = ""): Folder[] {
  const folders: Folder[] = [];

  if (bookmark.type === "folder") {
    const title = hierarchy === "" ? bookmark.name : `${hierarchy}/${bookmark.name}`;

    return [
      { title, id: bookmark.guid },
      ...(bookmark.children?.map((child) => getFolders(child, title)) || []).flat(),
    ];
  }

  return folders;
}

async function getChromiumProfiles(path: string) {
  if (!existsSync(`${path}/Local State`)) {
    return { profiles: [], defaultProfile: "" };
  }

  const file = await read(`${path}/Local State`, "utf-8");
  const localState = JSON.parse(file);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileInfoCache: Record<string, any> = localState.profile.info_cache;

  const profiles = Object.entries(profileInfoCache)
    // Only keep profiles that have bookmarks
    .filter(([profilePath]) => {
      const profileDirectory = readdirSync(`${path}/${profilePath}`);
      return profileDirectory.includes("Bookmarks");
    })
    .map(([path, profile]) => {
      return {
        path,
        name: profile.name,
      };
    });

  const defaultProfile = localState.profile?.last_used?.length > 0 ? localState.profile.last_used : profiles[0].path;

  profiles.sort((a, b) => a.name?.localeCompare(b.name));
  return { profiles, defaultProfile };
}

type UseChromiumBookmarksParams = {
  path: string;
  browserIcon: string;
  browserName: string;
  browserBundleId: string;
  query?: string;
};

export default function useChromiumBookmarks(
  enabled: boolean,
  { path, browserIcon, browserName, browserBundleId, query }: UseChromiumBookmarksParams,
) {
  const [currentProfile, setCurrentProfile] = useCachedState(`${browserName}-profile`, "");

  const { data: profiles } = useCachedPromise(
    async (enabled, path) => {
      if (!enabled) {
        return;
      }

      const { profiles, defaultProfile } = await getChromiumProfiles(path);

      // Initially set the current profile when nothing is set in the cache yet
      if (currentProfile === "") {
        setCurrentProfile(defaultProfile);
      }

      return profiles;
    },
    [enabled, path],
  );

  const transformBookmarks = useCallback(getBookmarks, []);
  const filterBookmarks = useCallback(
    (item: Bookmark) => {
      if (!query) return true;
      return fuzzyMatch(item, query);
    },
    [query],
  );

  const execute = useMemo(() => {
    return !!currentProfile && enabled && existsSync(`${path}/${currentProfile}/Bookmarks`);
  }, [currentProfile, enabled, path]);

  const fullPath = `file://${path}/${currentProfile}/Bookmarks`;

  const {
    data: dataBookmarks,
    isLoading: isLoadingBookmarks,
    mutate,
  } = useStreamJSON(fullPath, {
    dataPath: /^roots.(bookmark_bar|other|synced).children$/,
    transform: transformBookmarks,
    filter: filterBookmarks,
    pageSize: 100,
    execute,
  });

  const transformFolders = useCallback(getFolders, []);
  const filterFolders = useCallback(() => true, []);

  const { data: dataFolders, isLoading: isLoadingFolders } = useStreamJSON(fullPath, {
    dataPath: /^roots.(bookmark_bar|other|synced).children$/,
    transform: transformFolders,
    filter: filterFolders,
    pageSize: 100,
    execute,
  });

  const bookmarks =
    dataBookmarks?.map((bookmark) => {
      return {
        ...bookmark,
        id: `${bookmark.id}-${browserBundleId}`,
        browser: browserBundleId,
      };
    }) ?? [];

  const folders =
    dataFolders?.map((folder) => {
      return {
        ...folder,
        id: `${folder.id}-${browserBundleId}`,
        icon: browserIcon,
        browser: browserBundleId,
      };
    }) ?? [];

  return {
    bookmarks: enabled ? bookmarks : [],
    folders: enabled ? folders : [],
    isLoading: isLoadingBookmarks || isLoadingFolders,
    mutate,
    profiles: profiles || [],
    currentProfile,
    setCurrentProfile,
  };
}
