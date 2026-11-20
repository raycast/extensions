import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { getSearchFolder } from "../utils/bookmarkSearch";
import { loadChromiumFavicons } from "../utils/chromiumFavicons";
import { getChromiumFaviconSignature, getChromiumSourceSignature } from "../utils/chromiumSourceSignature";
import {
  getChromiumProfiles,
  readChromiumBookmarks,
  type ChromiumBookmarkFolder as BookmarkFolder,
  type ChromiumBookmarkItem as BookmarkItem,
} from "../utils/chromiumProfiles";

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

function getBookmarksWithSearchFolder(root: BookmarkFolder | undefined) {
  return root
    ? getBookmarks(root).map((bookmark) => ({ ...bookmark, searchFolder: getSearchFolder(root.name, bookmark.folder) }))
    : [];
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
    error: profilesError,
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
    error: bookmarksError,
  } = useCachedPromise(
    async (profile, isEnabled, currentPath) => {
      if (!profile || !isEnabled) {
        return;
      }

      return readChromiumBookmarks(currentPath, profile);
    },
    [currentProfile, enabled, path],
  );

  const toolbarRoot = data?.roots.bookmark_bar;
  const otherRoot = data?.roots.other;

  const rawBookmarks = useMemo(() => {
    const toolbarBookmarks = getBookmarksWithSearchFolder(toolbarRoot);
    const otherBookmarks = getBookmarksWithSearchFolder(otherRoot);

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
    error: enabled ? (profilesError ?? bookmarksError) : undefined,
  };
}
