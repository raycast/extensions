import { existsSync, readFile } from "fs";
import os from "os";
import { promisify } from "util";

import { useCachedPromise, useCachedState } from "@raycast/utils";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";

const ARC_BOOKMARKS_PATH = `${os.homedir()}/Library/Application Support/Arc`;

const read = promisify(readFile);

type Item = {
  id: string;
  parentID: string | null;
  childrenIds: string[];
};

type BookmarkURL = Item & {
  title: string | null;
  data: {
    tab: {
      savedTitle: string;
      savedURL: string;
    };
  };
};

type BookmarkFolder = Item & {
  title: string;
  data: {
    list: unknown;
  };
};

type BookmarkItem = BookmarkURL | BookmarkFolder;

type Container = {
  items?: (string | BookmarkItem)[];
};

type SidebarRoot = {
  sidebar: {
    containers: Container[];
  };
};

const isBookmarkURL = (bookmark: BookmarkItem): bookmark is BookmarkURL =>
  (bookmark.data as { tab?: unknown }).tab !== undefined;

type Bookmark = {
  id: string;
  title: string;
  url: string;
  folder: string;
};

function getBookmarks(bookmark: BookmarkItem, hierarchy = ""): Bookmark[] {
  const bookmarks = [];

  if (isBookmarkURL(bookmark)) {
    const bookmarkTitle = bookmark.title || bookmark.data.tab.savedTitle;
    const title = hierarchy === "" ? bookmarkTitle : `${hierarchy}/${bookmarkTitle}`;

    bookmarks.push({
      id: bookmark.id,
      title,
      url: bookmark.data.tab.savedURL,
      folder: hierarchy,
    });
  }

  return bookmarks;
}

type Folder = {
  id: string;
  title: string;
  childrenIds: string[];
};

const truthy = <T>(value: T | null | undefined): value is T => Boolean(value);

const isFolder = (bookmark: BookmarkItem): bookmark is BookmarkFolder =>
  (bookmark.data as { list?: unknown }).list !== undefined;

function getFolders(container: BookmarkItem[], item: BookmarkItem, hierarchy = ""): Folder[] {
  const folders: Folder[] = [];

  if (isFolder(item)) {
    const title = hierarchy === "" ? item.title : `${hierarchy}/${item.title}`;

    return [
      {
        title,
        id: item.id,
        childrenIds: item.childrenIds,
      },
      ...(
        item.childrenIds
          ?.map((childId) => container.find((item) => item.id === childId))
          .filter(truthy)
          .map((child) => getFolders(container, child, title)) || []
      ).flat(),
    ];
  }

  return folders;
}

async function getArcProfiles() {
  const path = `${ARC_BOOKMARKS_PATH}/User Data/Local State`;
  if (!existsSync(path)) {
    return { profiles: [], defaultProfile: "" };
  }

  const file = await read(path, "utf-8");
  const localState = JSON.parse(file);

  const profileInfoCache: Record<string, { name: string }> = localState.profile.info_cache;
  const profiles = Object.entries(profileInfoCache).map(([path, profile]) => ({
    path,
    name: path === "Default" ? "Default" : profile.name,
  }));

  const defaultProfile = localState.profile?.last_used?.length > 0 ? localState.profile.last_used : profiles[0].path;

  profiles.sort((a, b) => a.name.localeCompare(b.name));
  return { profiles, defaultProfile };
}

export default function useArcBookmarks(enabled: boolean) {
  const [currentProfile, setCurrentProfile] = useCachedState("arc-profile", "");
  const { data: profiles } = useCachedPromise(
    async (enabled) => {
      if (!enabled) {
        return;
      }

      const { profiles, defaultProfile } = await getArcProfiles();

      // Initially set the current profile when nothing is set in the cache yet
      if (currentProfile === "") {
        setCurrentProfile(defaultProfile);
      }

      return profiles;
    },
    [enabled]
  );

  const { data, isLoading, mutate } = useCachedPromise(
    async (profile, enabled) => {
      if (!profile || !enabled || !existsSync(`${ARC_BOOKMARKS_PATH}/StorableSidebar.json`)) {
        return;
      }

      const file = await read(`${ARC_BOOKMARKS_PATH}/StorableSidebar.json`);
      return JSON.parse(file.toString()) as SidebarRoot;
    },
    [currentProfile, enabled]
  );

  const container =
    data?.sidebar.containers
      .find((container) => container.items)
      ?.items?.filter((value): value is BookmarkItem => typeof value !== "string") ?? [];

  // const profileItems = getProfileItems(container);

  const bookmarks = container
    .flatMap((item) => getBookmarks(item))
    .map((bookmark) => {
      return {
        ...bookmark,
        id: `${bookmark.id}-${BROWSERS_BUNDLE_ID.arc}`,
        browser: BROWSERS_BUNDLE_ID.arc,
      };
    });

  const folders = container
    .flatMap((item) => getFolders(container, item))
    .map((folder) => {
      return {
        ...folder,
        id: `${folder.id}-${BROWSERS_BUNDLE_ID.arc}`,
        icon: "arc.png",
        browser: BROWSERS_BUNDLE_ID.arc,
      };
    });

  return {
    bookmarks,
    folders,
    isLoading,
    mutate,
    profiles: profiles || [],
    currentProfile,
    setCurrentProfile,
  };
}
