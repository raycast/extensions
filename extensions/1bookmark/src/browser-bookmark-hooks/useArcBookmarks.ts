import { existsSync, readFile } from "fs";
import os from "os";
import { promisify } from "util";

import { useCachedPromise, useCachedState } from "@raycast/utils";

import { BROWSERS_BUNDLE_ID } from "./useAvailableBrowsers";
import { useMemo } from "react";

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

type Space = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  containerIDs: ("pinned" | "unpinned" | (string & {}))[];
  id: string;
  title: string;
  profile: {
    default?: unknown;
    custom?: {
      _0: {
        directoryBasename: string;
      };
    };
  };
};

type TopAppsContainerId = {
  default?: unknown;
  custom?: {
    _0: {
      directoryBasename: string;
    };
  };
};

type Container = {
  items?: (string | BookmarkItem)[];
  spaces?: (string | Space)[];
  topAppsContainerIDs?: (string | TopAppsContainerId)[];
};

type SidebarRoot = {
  sidebar: {
    containers: Container[];
  };
};

function getTopAppsContainerId(container: Container, currentProfile: string) {
  const containerIds = container.topAppsContainerIDs;
  const index = containerIds?.findIndex(
    (item) =>
      typeof item !== "string" &&
      (currentProfile === "Default"
        ? item.default !== undefined
        : item.custom?._0.directoryBasename === currentProfile),
  );

  return index != null ? (containerIds?.[index + 1] as string) : undefined;
}

function getContainerIds(container: Container, currentProfile: string): string[] {
  const containerIds = (container.spaces ?? [])
    .filter((value): value is Space => typeof value !== "string")
    .filter((space) =>
      currentProfile === "Default"
        ? space.profile.default !== undefined
        : space.profile.custom?._0.directoryBasename === currentProfile,
    )
    .map((space) => {
      const pinnedIndex = space.containerIDs.findIndex((id) => id === "pinned");
      return space.containerIDs[pinnedIndex + 1];
    });

  return [...containerIds, getTopAppsContainerId(container, currentProfile)].filter(truthy);
}

const isBookmarkURL = (bookmark: BookmarkItem): bookmark is BookmarkURL =>
  (bookmark.data as { tab?: unknown }).tab !== undefined;

type Bookmark = {
  id: string;
  title: string;
  url: string;
  folder: string;
};

function getBookmarks(folders: Folder[], bookmark: BookmarkItem): Bookmark[] {
  const bookmarks = [];

  if (isBookmarkURL(bookmark)) {
    const bookmarkTitle = bookmark.title || bookmark.data.tab.savedTitle || "";
    const hierarchy = folders.find((folder) => folder.childrenIds.includes(bookmark.id))?.title ?? "";

    bookmarks.push({
      id: bookmark.id,
      title: bookmarkTitle,
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

function getFolders(root: BookmarkItem[], item: BookmarkItem, hierarchy = ""): Folder[] {
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
          ?.map((childId) => root.find((item) => item.id === childId))
          .filter(truthy)
          .map((child) => getFolders(root, child, title)) || []
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

  profiles.sort((a, b) => a.name?.localeCompare(b.name));
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
    [enabled],
  );

  const { data, isLoading, mutate } = useCachedPromise(
    async (profile, enabled) => {
      if (!profile || !enabled || !existsSync(`${ARC_BOOKMARKS_PATH}/StorableSidebar.json`)) {
        return;
      }

      const file = await read(`${ARC_BOOKMARKS_PATH}/StorableSidebar.json`);
      return JSON.parse(file.toString()) as SidebarRoot;
    },
    [currentProfile, enabled],
  );

  const container = useMemo(() => data?.sidebar.containers.find((container) => container.items), [data]);
  const containerIds = useMemo(
    () => (container ? getContainerIds(container, currentProfile) : []),
    [container, currentProfile],
  );
  const root = useMemo(() => {
    return (container?.items ?? []).filter((value): value is BookmarkItem => typeof value !== "string");
  }, [container]);

  const folders = useMemo(() => {
    return root.filter((item) => containerIds.includes(item.parentID ?? "")).flatMap((item) => getFolders(root, item));
  }, [root, containerIds]);

  const parentIds = useMemo(() => {
    return folders
      .map((folder) => [folder.id, folder.childrenIds])
      .concat(containerIds)
      .flat(Infinity);
  }, [folders, containerIds]);

  const bookmarks = useMemo(() => {
    return root
      .filter((item) => parentIds.includes(item.parentID ?? ""))
      .flatMap((item) => getBookmarks(folders, item))
      .map((bookmark) => {
        return {
          ...bookmark,
          id: `${bookmark.id}-${BROWSERS_BUNDLE_ID.arc}`,
          browser: BROWSERS_BUNDLE_ID.arc,
        };
      });
  }, [root, folders, parentIds]);

  return {
    bookmarks,
    folders: folders.map((folder) => ({
      browser: BROWSERS_BUNDLE_ID.arc,
      icon: "arc.png",
      id: `${folder.id}-${BROWSERS_BUNDLE_ID.arc}`,
      title: folder.title,
    })),
    isLoading,
    mutate,
    profiles: profiles || [],
    currentProfile,
    setCurrentProfile,
  };
}
