import { useCallback, useState } from "react";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { getOpenTabsWithFallback, isSearchBrowserInstalled } from "../lib/browser";
import {
  readBookmarks,
  readBrowserSettings,
  readHistory,
  readLocalBrowserSnapshot,
  readTabsLocalSnapshot,
} from "../lib/data";

export function useSearchInstalled() {
  return useCachedPromise(isSearchBrowserInstalled, [], {
    keepPreviousData: true,
  });
}

export function useOpenTabs() {
  // Read only spaces, pins, remote tabs, and settings (skips parsing history.json and bookmarks.json)
  const [localSnapshot, setLocalSnapshot] = useState(() => readTabsLocalSnapshot());
  const { data: liveData, isLoading, revalidate: revalidateLive } = usePromise(getOpenTabsWithFallback, []);

  const revalidate = useCallback(() => {
    setLocalSnapshot(readTabsLocalSnapshot());
    void revalidateLive();
  }, [revalidateLive]);

  return {
    data: {
      tabs: liveData?.tabs ?? [],
      isRunning: liveData?.isRunning ?? true,
      permissionDenied: liveData?.permissionDenied ?? false,
      spaces: localSnapshot.spaces,
      pins: localSnapshot.pins,
      remoteDevices: localSnapshot.remoteDevices,
      settings: localSnapshot.settings,
    },
    isLoading,
    revalidate,
  };
}

export function useBookmarks() {
  const [data, setData] = useState(() => ({
    bookmarks: readBookmarks(),
    settings: readBrowserSettings(),
  }));

  const revalidate = useCallback(() => {
    setData({
      bookmarks: readBookmarks(),
      settings: readBrowserSettings(),
    });
  }, []);

  return { data, isLoading: false, revalidate };
}

export function useHistory() {
  const [data, setData] = useState(() => ({
    history: readHistory(),
    settings: readBrowserSettings(),
  }));

  const revalidate = useCallback(() => {
    setData({
      history: readHistory(),
      settings: readBrowserSettings(),
    });
  }, []);

  return { data, isLoading: false, revalidate };
}

export function useUnifiedSearchData() {
  // Render local history, bookmarks, pins, and iCloud tabs on frame 1 (<5ms) while live tabs load via single osascript
  const [localSnapshot, setLocalSnapshot] = useState(() => readLocalBrowserSnapshot());
  const { data: liveData, isLoading, revalidate: revalidateLive } = usePromise(getOpenTabsWithFallback, []);

  const revalidate = useCallback(() => {
    setLocalSnapshot(readLocalBrowserSnapshot());
    void revalidateLive();
  }, [revalidateLive]);

  return {
    data: {
      tabs: liveData?.tabs ?? [],
      isRunning: liveData?.isRunning ?? true,
      permissionDenied: liveData?.permissionDenied ?? false,
      spaces: localSnapshot.spaces,
      pins: localSnapshot.pins,
      remoteDevices: localSnapshot.remoteDevices,
      bookmarks: localSnapshot.bookmarks,
      history: localSnapshot.history,
      settings: localSnapshot.settings,
    },
    isLoading,
    revalidate,
  };
}
