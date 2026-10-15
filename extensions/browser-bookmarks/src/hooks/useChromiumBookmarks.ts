import { existsSync, readdirSync, readFile } from "fs";
import { join } from "path";
import { promisify } from "util";

import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { loadChromiumFavicons } from "../utils/chromiumFavicons";
import { getChromiumFaviconSignature, getChromiumSourceSignature } from "../utils/chromiumSourceSignature";

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
  } & Record<string, BookmarkFolder | undefined>;
};

const CHROMIUM_BOOKMARK_FILE_NAMES = ["Bookmarks", "AccountBookmarks"] as const;

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

function getBookmarkCount(bookmarksRoot: BookmarksRoot) {
  return Object.values(bookmarksRoot.roots).reduce((count, root) => count + (root ? getBookmarks(root).length : 0), 0);
}

function hasChromiumBookmarksFile(path: string, profile: string) {
  return CHROMIUM_BOOKMARK_FILE_NAMES.some((fileName) => existsSync(join(path, profile, fileName)));
}

async function readChromiumBookmarks(path: string, profile: string) {
  const accountBookmarksPath = join(path, profile, "AccountBookmarks");

  if (existsSync(accountBookmarksPath)) {
    try {
      const accountBookmarks = JSON.parse((await read(accountBookmarksPath)).toString()) as BookmarksRoot;
      if (getBookmarkCount(accountBookmarks) > 0) {
        return accountBookmarks;
      }
    } catch {
      // Fall back to the legacy Bookmarks file below.
    }
  }

  const bookmarksPath = join(path, profile, "Bookmarks");
  if (!existsSync(bookmarksPath)) {
    return;
  }

  return JSON.parse((await read(bookmarksPath)).toString()) as BookmarksRoot;
}

type Folder = {
  id: string;
  title: string;
};

type ChromiumProfile = {
  path: string;
  name: string;
};

type ChromiumProfilesResult = {
  profiles: ChromiumProfile[];
  defaultProfile: string;
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

async function getChromiumProfilesFallback(path: string): Promise<ChromiumProfilesResult> {
  if (!existsSync(path)) return { profiles: [], defaultProfile: "" };

  let profiles;
  try {
    profiles = readdirSync(path, { withFileTypes: true })
      .filter((d) => d.isDirectory() && hasChromiumBookmarksFile(path, d.name))
      .map((d) => ({ path: d.name, name: d.name }));
  } catch {
    return { profiles: [], defaultProfile: "" };
  }

  profiles.sort((a, b) => a.name.localeCompare(b.name));
  const defaultProfile = profiles.find((p) => p.path === "Default")?.path || profiles[0]?.path || "";

  return { profiles, defaultProfile };
}

async function getChromiumProfiles(path: string): Promise<ChromiumProfilesResult> {
  if (!existsSync(`${path}/Local State`)) {
    return { profiles: [], defaultProfile: "" };
  }

  let file: string;
  try {
    file = await read(`${path}/Local State`, "utf-8");
  } catch {
    // Handle permission errors (EPERM) or other file access errors
    return getChromiumProfilesFallback(path);
  }

  let localState;
  try {
    localState = JSON.parse(file);
  } catch {
    return getChromiumProfilesFallback(path);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileInfoCache: Record<string, any> = localState.profile.info_cache;

  const profiles = Object.entries(profileInfoCache)
    .filter(([profilePath]) => {
      try {
        return hasChromiumBookmarksFile(path, profilePath);
      } catch {
        return false;
      }
    })
    .map(([path, profile]) => {
      return {
        path,
        name: profile.name,
      };
    });

  const defaultProfile =
    localState.profile?.last_used?.length > 0 ? localState.profile.last_used : profiles[0]?.path || "";

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
  const [storedCurrentProfile, setCurrentProfile] = useCachedState(`${browserName}-profile`, "");
  const lastKnownSourceSignatureRef = useRef<string | undefined>(undefined);
  const lastKnownFaviconSignatureRef = useRef<string | undefined>(undefined);
  const isCheckingForChangesRef = useRef(false);

  const {
    data: profilesData,
    isLoading: isLoadingProfiles,
    mutate: mutateProfiles,
  } = useCachedPromise(
    async (isEnabled, currentPath) => {
      if (!isEnabled) {
        return { profiles: [], defaultProfile: "" };
      }

      return getChromiumProfiles(currentPath);
    },
    [enabled, path],
  );

  const profiles = profilesData?.profiles || [];
  const isStoredProfileValid = profiles.some((profile) => profile.path === storedCurrentProfile);
  const currentProfile =
    storedCurrentProfile && isStoredProfileValid ? storedCurrentProfile : profilesData?.defaultProfile || "";

  useEffect(() => {
    if (!enabled || !profilesData?.defaultProfile) {
      return;
    }

    if (storedCurrentProfile === "" || !isStoredProfileValid) {
      setCurrentProfile(profilesData.defaultProfile);
    }
  }, [enabled, isStoredProfileValid, profilesData, setCurrentProfile, storedCurrentProfile]);

  const {
    data,
    isLoading: isLoadingBookmarks,
    mutate: mutateBookmarkData,
  } = useCachedPromise(
    async (profile, isEnabled, currentPath) => {
      if (!profile || !isEnabled || !hasChromiumBookmarksFile(currentPath, profile)) {
        return;
      }

      return readChromiumBookmarks(currentPath, profile);
    },
    [currentProfile, enabled, path],
  );

  const toolbarRoot = data?.roots.bookmark_bar;
  const otherRoot = data?.roots.other;

  const rawBookmarks = useMemo(() => {
    const toolbarBookmarks = toolbarRoot ? getBookmarks(toolbarRoot) : [];
    const otherBookmarks = otherRoot ? getBookmarks(otherRoot) : [];

    return [...toolbarBookmarks, ...otherBookmarks].map((bookmark) => {
      return {
        ...bookmark,
        id: `${bookmark.id}-${browserBundleId}`,
        browser: browserBundleId,
      };
    });
  }, [toolbarRoot, otherRoot, browserBundleId]);

  const { data: favicons = {}, mutate: mutateFavicons } = useCachedPromise(
    async (profile, isEnabled, currentPath, currentBrowserBundleId, currentBookmarks) => {
      if (!profile || !isEnabled) {
        return {};
      }

      try {
        return await loadChromiumFavicons(currentPath, profile, currentBrowserBundleId, currentBookmarks);
      } catch (error) {
        console.error(`Could not load local favicons for ${currentBrowserBundleId}`, error);
        return {};
      }
    },
    [currentProfile, enabled, path, browserBundleId, rawBookmarks],
  );

  const bookmarks = useMemo(
    () => rawBookmarks.map((bookmark) => ({ ...bookmark, favicon: favicons[bookmark.url] })),
    [favicons, rawBookmarks],
  );

  const mutate = useCallback(async () => {
    await Promise.all([mutateProfiles(), mutateBookmarkData(), mutateFavicons()]);
  }, [mutateBookmarkData, mutateFavicons, mutateProfiles]);

  const isLoading =
    isLoadingProfiles || isLoadingBookmarks || (enabled && currentProfile === "" && profiles.length > 0);

  useEffect(() => {
    if (!enabled) {
      lastKnownSourceSignatureRef.current = undefined;
      lastKnownFaviconSignatureRef.current = undefined;
      return;
    }

    let isActive = true;

    async function primeSignature() {
      const [sourceSignature, faviconSignature] = await Promise.all([
        getChromiumSourceSignature(path, currentProfile),
        getChromiumFaviconSignature(path, currentProfile),
      ]);

      if (isActive) {
        lastKnownSourceSignatureRef.current = sourceSignature;
        lastKnownFaviconSignatureRef.current = faviconSignature;
      }
    }

    void primeSignature();

    return () => {
      isActive = false;
    };
  }, [currentProfile, enabled, path]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isActive = true;

    async function checkForUpdates() {
      if (!isActive || isLoading || isCheckingForChangesRef.current) {
        return;
      }

      isCheckingForChangesRef.current = true;

      try {
        const [nextSourceSignature, nextFaviconSignature] = await Promise.all([
          getChromiumSourceSignature(path, currentProfile),
          getChromiumFaviconSignature(path, currentProfile),
        ]);
        const previousSourceSignature = lastKnownSourceSignatureRef.current;
        const previousFaviconSignature = lastKnownFaviconSignatureRef.current;

        if (!previousSourceSignature || !previousFaviconSignature) {
          lastKnownSourceSignatureRef.current = nextSourceSignature;
          lastKnownFaviconSignatureRef.current = nextFaviconSignature;
          return;
        }

        const sourceChanged = nextSourceSignature !== previousSourceSignature;
        const faviconChanged = nextFaviconSignature !== previousFaviconSignature;

        lastKnownSourceSignatureRef.current = nextSourceSignature;
        lastKnownFaviconSignatureRef.current = nextFaviconSignature;

        if (sourceChanged) {
          await mutate();
        } else if (faviconChanged) {
          await mutateFavicons();
        }
      } finally {
        isCheckingForChangesRef.current = false;
      }
    }

    const timer = setInterval(() => {
      void checkForUpdates();
    }, 3000);

    return () => {
      isActive = false;
      clearInterval(timer);
    };
  }, [currentProfile, enabled, isLoading, mutate, mutateFavicons, path]);

  const folders = useMemo(() => {
    const toolbarFolders = toolbarRoot ? getFolders(toolbarRoot) : [];
    const otherFolders = otherRoot ? getFolders(otherRoot) : [];

    return [...toolbarFolders, ...otherFolders].map((folder) => {
      return {
        ...folder,
        id: `${folder.id}-${browserBundleId}`,
        icon: browserIcon,
        browser: browserBundleId,
      };
    });
  }, [toolbarRoot, otherRoot, browserBundleId, browserIcon]);

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
