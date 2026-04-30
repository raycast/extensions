import { existsSync, readdirSync, readFile } from "fs";
import { stat } from "fs/promises";
import { join } from "path";
import { promisify } from "util";

import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useCallback, useEffect, useRef } from "react";

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
      .filter((d) => d.isDirectory() && existsSync(join(path, d.name, "Bookmarks")))
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
        const profileDirectory = readdirSync(`${path}/${profilePath}`);
        return profileDirectory.includes("Bookmarks");
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

async function getFileSignature(filePath: string) {
  try {
    const fileStat = await stat(filePath);
    return `${filePath}:${fileStat.size}:${fileStat.mtimeMs}`;
  } catch {
    return `${filePath}:missing`;
  }
}

async function getChromiumSourceSignature(path: string, profile: string) {
  const signatures = [await getFileSignature(join(path, "Local State"))];

  if (profile) {
    signatures.push(await getFileSignature(join(path, profile, "Bookmarks")));
  }

  return signatures.join("|");
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
    mutate: mutateBookmarks,
  } = useCachedPromise(
    async (profile, isEnabled, currentPath) => {
      if (!profile || !isEnabled || !existsSync(`${currentPath}/${profile}/Bookmarks`)) {
        return;
      }

      const file = await read(`${currentPath}/${profile}/Bookmarks`);
      return JSON.parse(file.toString()) as BookmarksRoot;
    },
    [currentProfile, enabled, path],
  );

  const mutate = useCallback(async () => {
    await Promise.all([mutateProfiles(), mutateBookmarks()]);
  }, [mutateBookmarks, mutateProfiles]);

  const isLoading =
    isLoadingProfiles || isLoadingBookmarks || (enabled && currentProfile === "" && profiles.length > 0);

  useEffect(() => {
    if (!enabled) {
      lastKnownSourceSignatureRef.current = undefined;
      return;
    }

    let isActive = true;

    async function primeSignature() {
      const sourceSignature = await getChromiumSourceSignature(path, currentProfile);

      if (isActive) {
        lastKnownSourceSignatureRef.current = sourceSignature;
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
        const nextSourceSignature = await getChromiumSourceSignature(path, currentProfile);
        const previousSourceSignature = lastKnownSourceSignatureRef.current;

        if (!previousSourceSignature) {
          lastKnownSourceSignatureRef.current = nextSourceSignature;
          return;
        }

        if (nextSourceSignature !== previousSourceSignature) {
          lastKnownSourceSignatureRef.current = nextSourceSignature;
          await mutate();
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
  }, [currentProfile, enabled, mutate, path]);

  const toolbarBookmarks = data ? getBookmarks(data.roots.bookmark_bar) : [];
  const toolbarFolders = data ? getFolders(data.roots.bookmark_bar) : [];

  const otherBookmarks = data ? getBookmarks(data.roots.other) : [];
  const otherFolders = data ? getFolders(data.roots.other) : [];

  const bookmarks = [...toolbarBookmarks, ...otherBookmarks].map((bookmark) => {
    return {
      ...bookmark,
      id: `${bookmark.id}-${browserBundleId}`,
      browser: browserBundleId,
    };
  });

  const folders = [...toolbarFolders, ...otherFolders].map((folder) => {
    return {
      ...folder,
      id: `${folder.id}-${browserBundleId}`,
      icon: browserIcon,
      browser: browserBundleId,
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
