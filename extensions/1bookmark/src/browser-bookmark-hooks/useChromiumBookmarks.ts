import { existsSync, readdirSync, readFile } from "fs";
import { join } from "path";
import { promisify } from "util";

import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useMemo } from "react";

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

type BookmarksRoot = {
  roots: {
    bookmark_bar: BookmarkFolder;
    other: BookmarkFolder;
  };
};

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

async function getChromiumProfilesFallback(path: string) {
  if (!existsSync(path)) return { profiles: [], defaultProfile: "" };

  const profiles = readdirSync(path, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(path, d.name, "Bookmarks")))
    .map((d) => ({ path: d.name, name: d.name }));

  profiles.sort((a, b) => a.name.localeCompare(b.name));
  const defaultProfile = profiles.find((p) => p.path === "Default")?.path || profiles[0]?.path || "";

  return { profiles, defaultProfile };
}

async function getChromiumProfiles(path: string) {
  if (!existsSync(`${path}/Local State`)) {
    return { profiles: [], defaultProfile: "" };
  }

  const file = await read(`${path}/Local State`, "utf-8");
  let localState;
  try {
    localState = JSON.parse(file);
  } catch (e) {
    return getChromiumProfilesFallback(path);
  }

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
};

export default function useChromiumBookmarks(
  enabled: boolean,
  { path, browserIcon, browserName, browserBundleId }: UseChromiumBookmarksParams,
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

  const { data, isLoading, mutate } = useCachedPromise(
    async (profile, enabled, path) => {
      if (!profile || !enabled || !existsSync(`${path}/${profile}/Bookmarks`)) {
        return;
      }

      const file = await read(`${path}/${profile}/Bookmarks`);
      return JSON.parse(file.toString()) as BookmarksRoot;
    },
    [currentProfile, enabled, path],
  );

  const toolbarBookmarks = useMemo(() => (data ? getBookmarks(data.roots.bookmark_bar) : []), [data]);
  const toolbarFolders = useMemo(() => (data ? getFolders(data.roots.bookmark_bar) : []), [data]);

  const otherBookmarks = useMemo(() => (data ? getBookmarks(data.roots.other) : []), [data]);
  const otherFolders = useMemo(() => (data ? getFolders(data.roots.other) : []), [data]);

  const bookmarks = useMemo(() => {
    return [...toolbarBookmarks, ...otherBookmarks].map((bookmark) => {
      return {
        ...bookmark,
        id: `${bookmark.id}-${browserBundleId}`,
        browser: browserBundleId,
      };
    });
  }, [toolbarBookmarks, otherBookmarks, browserBundleId]);

  const folders = useMemo(() => {
    return [...toolbarFolders, ...otherFolders].map((folder) => {
      return {
        ...folder,
        id: `${folder.id}-${browserBundleId}`,
        icon: browserIcon,
        browser: browserBundleId,
      };
    });
  }, [toolbarFolders, otherFolders, browserBundleId]);

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
