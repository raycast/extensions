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
import { BookmarkItem, BrowserSettingsSnapshot, HistoryEntry } from "../lib/types";

export function useSearchInstalled() {
  return useCachedPromise(isSearchBrowserInstalled, [], {
    keepPreviousData: true,
  });
}

export function useOpenTabs() {
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
    error: localSnapshot.error,
    isLoading,
    revalidate,
  };
}

function loadBookmarksState(): {
  data: { bookmarks: BookmarkItem[]; settings: BrowserSettingsSnapshot | null };
  error: Error | null;
} {
  try {
    const bookmarks = readBookmarks();
    let settings: BrowserSettingsSnapshot | null = null;
    try {
      settings = readBrowserSettings();
    } catch {
      settings = null;
    }
    return { data: { bookmarks, settings }, error: null };
  } catch (err) {
    return {
      data: { bookmarks: [], settings: null },
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

export function useBookmarks() {
  const [state, setState] = useState(loadBookmarksState);

  const revalidate = useCallback(() => {
    setState(loadBookmarksState());
  }, []);

  return { data: state.data, error: state.error, isLoading: false, revalidate };
}

function loadHistoryState(): {
  data: { history: HistoryEntry[]; settings: BrowserSettingsSnapshot | null };
  error: Error | null;
} {
  try {
    const history = readHistory();
    let settings: BrowserSettingsSnapshot | null = null;
    try {
      settings = readBrowserSettings();
    } catch {
      settings = null;
    }
    return { data: { history, settings }, error: null };
  } catch (err) {
    return {
      data: { history: [], settings: null },
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

export function useHistory() {
  const [state, setState] = useState(loadHistoryState);

  const revalidate = useCallback(() => {
    setState(loadHistoryState());
  }, []);

  return { data: state.data, error: state.error, isLoading: false, revalidate };
}

export function useUnifiedSearchData() {
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
    error: localSnapshot.error,
    isLoading,
    revalidate,
  };
}
