import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { WebSocket } from "ws";
import { Icon, Toast, showToast, getPreferenceValues } from "@raycast/api";
import { DisplayTab, CollapsedListItem, BookmarkItem, HistoryItem, DownloadItem, BridgeMessage } from "../types";
import {
  globalSocket,
  globalDataVersion,
  globalStructuralVersion,
  globalExtensionData,
  getOrLoadCache,
  flushCacheNow,
  listeners,
  ensureConnection,
  viewReturnListeners,
  globalSessions,
  globalHistory,
  globalBookmarks,
  globalDownloads,
  EMPTY_GROUPS,
  updateCommandMountTime,
  checkServerHealth,
  globalServerChecked,
} from "../context/BrowserStore";

const EMPTY_BOOKMARKS: BookmarkItem[] = [];
const EMPTY_SESSIONS: HistoryItem[] = [];
const EMPTY_DOWNLOADS: DownloadItem[] = [];
const EMPTY_HISTORY: HistoryItem[] = [];

export function useViewReturn() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    // V407: Removed the immediate setTimeout here.
    // It was causing a forced complete re-render 50ms after startup.
    const listener = () => setTick((t) => t + 1);
    viewReturnListeners.add(listener);
    return () => {
      viewReturnListeners.delete(listener);
    };
  }, []);
  return tick;
}

export function useBrowser(
  searchText: string,
  browserFilter: string = "all",
  windowFilter: string = "all",
  searchMode: "filter" | "search" = "filter",
) {
  // V300: Defer heavy filter changes to keep typing smooth, but use direct values on mount
  const deferredBrowserFilter = browserFilter;
  const deferredWindowFilter = windowFilter;

  // V1603: Consolidated Preferences (Top-Level)
  const preferences = useMemo(() => getPreferenceValues(), []);
  const isSearchMode = searchMode === "search";

  const [, setDataVersion] = useState(globalDataVersion);
  const [structuralVersion, setStructuralVersion] = useState(globalStructuralVersion);

  // V1100: PULL-BASED RENDER
  // We read directly from the global store which is already hydrated at module-level.
  // This ensures Frame 1 is NEVER empty.
  const extensionData = getOrLoadCache();

  const hasCachedData = !!(extensionData && extensionData.tabs.length > 0);
  const [isTabsLoading, setIsTabsLoading] = useState(!hasCachedData);

  const [isConnecting, setIsConnecting] = useState(!globalSocket);

  const [serverStatus, setServerStatus] = useState<"STOPPED" | "WAITING" | "CONNECTED">(
    hasCachedData ? "CONNECTED" : globalSocket ? "WAITING" : "STOPPED",
  );

  // ─── Server health state ───────────────────────────────────────────────────
  const [serverDown, setServerDown] = useState(!globalServerChecked ? false : !globalSocket);

  const socketRef = useRef<WebSocket | null>(globalSocket);

  const isSearchActive = isSearchMode && searchText.trim().length > 0;

  const updateLocalState = useCallback(() => {
    // V1615: Absolute Search Decoupling
    // If we are actively searching the web, do not process any local state/tab changes.
    if (isSearchActive) return;

    // V406: Use functional state updates to strictly prevent React from queueing useless re-renders
    // if the primitive values haven't actually changed.
    setDataVersion((prev) => (prev === globalDataVersion ? prev : globalDataVersion));
    setStructuralVersion((prev) => (prev === globalStructuralVersion ? prev : globalStructuralVersion));

    setIsConnecting((prev) => {
      const next = !globalSocket;
      return prev === next ? prev : next;
    });

    setServerStatus((prev) => {
      let next: "STOPPED" | "WAITING" | "CONNECTED" = "STOPPED";
      const hasData = globalExtensionData && globalExtensionData.tabs.length > 0;

      if (hasData) {
        next = "CONNECTED";
      } else if (globalSocket) {
        next = "WAITING";
      }
      return prev === next ? prev : next;
    });

    // Update server/browser state based on socket
    if (globalSocket) {
      setServerDown(false);
    }

    socketRef.current = globalSocket;

    setIsTabsLoading((prev) => {
      const next = !(globalExtensionData || !globalSocket);
      return prev === next ? prev : next;
    });
  }, [isSearchActive]);

  useEffect(() => {
    listeners.add(updateLocalState);

    // Track mount time to ignore media updates for the first 1.5s
    updateCommandMountTime();

    // V900: ensureConnection() is now called at the module level in BrowserStore.
    updateLocalState();

    return () => {
      listeners.delete(updateLocalState);
      // V400: Eagerly flush cache on cleanup so next open has fresh data
      flushCacheNow();
    };
  }, [updateLocalState]);

  // ─── Health check on mount — skip if already connected ───────────────────
  useEffect(() => {
    // If socket is already open, server is clearly up — no need to hit /health
    if (globalSocket && globalSocket.readyState === 1) return;

    let cancelled = false;
    checkServerHealth().then((isUp) => {
      if (cancelled) return;
      if (!isUp) {
        setServerDown(true);
      } else {
        setServerDown(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // V310: Predictive Media Seeker (100ms local tick)
  // Deactivated completely when actively searching to free up CPU cycles.
  useEffect(() => {
    if (isSearchActive) return;

    let lastTick = performance.now();
    const ticker = setInterval(() => {
      if (!globalExtensionData || !globalExtensionData.mergedTabs) return;

      // V1403: Silent Ticker Sleep
      // If no tabs are actually playing, we don't need to do any math.
      const hasPlayingTab = globalExtensionData.tabs.some((t) => t.paused === false && t.currentTime !== undefined);
      if (!hasPlayingTab) return;

      const now = performance.now();
      const delta = (now - lastTick) / 1000;
      lastTick = now;

      let changed = false;
      // 1. Mutate raw playback data directly in memory
      globalExtensionData.tabs.forEach((tab) => {
        if (tab.currentTime !== undefined && tab.duration && tab.paused === false) {
          const nextTime = Math.min(tab.currentTime + delta, tab.duration);
          if (nextTime !== tab.currentTime) {
            tab.currentTime = nextTime;
            changed = true;
          }
        }
      });

      if (changed) {
        // 2. Mutate mergedTabs directly
        globalExtensionData.mergedTabs.forEach((dt) => {
          if (dt.currentTime !== undefined && dt.duration && dt.paused === false) {
            dt.currentTime = Math.min(dt.currentTime + 0.1, dt.duration);
          }
        });
      }
    }, 100);

    return () => clearInterval(ticker);
  }, [isSearchActive]);

  const sendToSocket = useCallback((msg: BridgeMessage) => {
    if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
      globalSocket.send(JSON.stringify(msg));
    } else {
      showToast(Toast.Style.Failure, "Ghost Server not connected");
    }
  }, []);

  // --- TAB MERGER (V309: Uses Pre-processed tabs for instant Frame 1) ---
  const memoizedMergedTabs = useMemo(() => {
    if (isSearchActive) return [];
    return extensionData?.mergedTabs || [];
  }, [extensionData, structuralVersion, isSearchActive]);

  // V1200: ZERO-TRANSFORMATION PASS-THROUGH
  // We use DEFERRED filters so the Dropdown UI updates instantly while the list catches up.
  const allDisplayTabs = useMemo(() => {
    if (isSearchActive) return [];
    const nextTabs = extensionData?.mergedTabs || [];
    const bFilter = deferredBrowserFilter;
    const wFilter = deferredWindowFilter;

    if (bFilter === "all" && wFilter === "all") return nextTabs;

    return nextTabs.filter((t) => {
      const matchBrowser = bFilter === "all" || t.browserType === bFilter;
      // Popup tabs always pass the window filter — they have no dropdown entry
      // so they should always be visible in the main list regardless of window selection
      const matchWindow = wFilter === "all" || t.windowType === "popup" || String(t.windowId) === String(wFilter);
      return matchBrowser && matchWindow;
    });
  }, [extensionData, structuralVersion, deferredBrowserFilter, deferredWindowFilter, isSearchActive]);

  const rawStructure = useMemo(() => {
    if (isSearchActive) return { sections: {}, items: [] };
    const groupByDomain = (preferences.groupByDomain as boolean) ?? true;

    const sections: Record<string, DisplayTab[]> = {};
    const items: CollapsedListItem[] = [];
    const grouped = new Map<number | string, DisplayTab[]>();

    // Group tabs by groupId for collapsed view folders
    allDisplayTabs.forEach((tab) => {
      if (tab.groupId && tab.groupId !== -1) {
        if (!grouped.has(tab.groupId)) grouped.set(tab.groupId, []);
        grouped.get(tab.groupId)!.push(tab);
      }
    });

    const processedGroups = new Set<string | number>();
    allDisplayTabs.forEach((tab) => {
      // 1. Build collapsed view items
      if (tab.groupId && tab.groupId !== -1) {
        if (!processedGroups.has(tab.groupId)) {
          processedGroups.add(tab.groupId);
          const groupTabs = grouped.get(tab.groupId);
          const groupInfo = extensionData?.groups[tab.groupId];
          if (groupTabs && groupInfo) {
            items.push({
              type: "folder",
              id: tab.groupId,
              title: groupInfo.title || "Grouped",
              tabs: groupTabs,
              color: groupInfo.color,
              isActive: groupTabs.some((t) => t.isActive),
              browserType: tab.browserType,
            });
          }
        }
      } else {
        items.push({ type: "tab", tab });
      }

      // 2. Build normal view sections
      const sectionName = groupByDomain
        ? tab.groupId && tab.groupId !== -1
          ? extensionData?.groups[tab.groupId]?.title || "Grouped"
          : tab.subtitle || "Ungrouped"
        : "Open Tabs";

      if (!sections[sectionName]) sections[sectionName] = [];
      sections[sectionName].push(tab);
    });

    // Memoize the raw structure (expensive grouping)
    // V202: Performance optimization - Depend only on data, not search text
    return { sections, items };
  }, [allDisplayTabs, extensionData, structuralVersion]);

  const { normalSections, collapsedViewItems } = useMemo(() => {
    if (isSearchActive) {
      return { normalSections: {}, collapsedViewItems: [] };
    }
    const { sections, items } = rawStructure;
    const lowerSearch = searchText.trim().toLowerCase();

    // Filter Sections
    const filteredSections: Record<string, DisplayTab[]> = {};
    Object.entries(sections).forEach(([title, tabs]) => {
      const filtered = tabs.filter((t) => t.searchTitle.includes(lowerSearch) || t.searchUrl.includes(lowerSearch));
      if (filtered.length > 0) filteredSections[title] = filtered;
    });

    // Filter Items (for Collapsed View)
    const filteredItems = items.filter((item) => {
      if (item.type === "tab") {
        return item.tab.searchTitle.includes(lowerSearch) || item.tab.searchUrl.includes(lowerSearch);
      }
      return (
        item.title.toLowerCase().includes(lowerSearch) ||
        item.tabs.some((t) => t.searchTitle.includes(lowerSearch) || t.searchUrl.includes(lowerSearch))
      );
    });

    return { normalSections: filteredSections, collapsedViewItems: filteredItems };
  }, [rawStructure, searchText, isSearchActive]);

  const { availableBrowsers, lastActiveBrowser, activeBrowserName, browserIconMap, windowsByBrowser } = useMemo(() => {
    if (isSearchActive) {
      return {
        availableBrowsers: [],
        lastActiveBrowser: "browser",
        activeBrowserName: "Web Search",
        totalTabsCount: 0,
        browserIconMap: {},
        windowsByBrowser: {},
      };
    }
    const allBrowsersTabs = memoizedMergedTabs;
    const browsers: string[] = [];
    const iconMap: Record<string, Icon | string> = {};
    const browserIconMapSource: Record<string, Icon | string> = {
      edge: Icon.Folder,
      chrome: Icon.Circle,
      brave: Icon.AppWindow,
      vivaldi: Icon.Store,
      opera: Icon.Terminal,
    };
    const ICON_SEQUENCE = [Icon.Window, Icon.AppWindow, Icon.Store, Icon.Terminal];

    let latestTime = 0;
    let recentB = "";

    // Step 1: Single pass for browser stats and recent activity
    allBrowsersTabs.forEach((t) => {
      const bType = t.browserType || "browser";
      if (!browsers.includes(bType)) {
        browsers.push(bType);
        iconMap[bType] = browserIconMapSource[bType] || ICON_SEQUENCE[browsers.length % ICON_SEQUENCE.length];
      }
      if (t.lastAccessed && t.lastAccessed > latestTime) {
        latestTime = t.lastAccessed;
        recentB = bType;
      }
    });

    const browserNames: Record<string, string> = {
      edge: "Edge",
      chrome: "Chrome",
      brave: "Brave",
      helium: "Helium",
      vivaldi: "Vivaldi",
      opera: "Opera",
      other: "Browser",
    };

    // Step 2: Extract windows per browser efficiently
    const windowsByBrowser: Record<string, { id: string; name: string; tabCount: number; isPopup?: boolean }[]> = {};
    const browserToWindows = new Map<string, Map<string | number, DisplayTab[]>>();

    allBrowsersTabs.forEach((t) => {
      const bType = t.browserType || "browser";
      const wId = t.windowId !== undefined ? t.windowId : `${bType}-unknown`;

      if (!browserToWindows.has(bType)) browserToWindows.set(bType, new Map());
      const wMap = browserToWindows.get(bType)!;
      if (!wMap.has(wId)) wMap.set(wId, []);
      wMap.get(wId)!.push(t);
    });

    browserToWindows.forEach((wMap, browserType) => {
      const sortedIds = Array.from(wMap.keys()).sort((a, b) => {
        if (typeof a === "number" && typeof b === "number") return a - b;
        return String(a).localeCompare(String(b));
      });

      windowsByBrowser[browserType] = sortedIds
        .filter((wId) => {
          const tabsInWindow = wMap.get(wId)!;
          return !tabsInWindow.some((t) => t.windowType === "popup");
        })
        .map((wId, index) => {
          const tabsInWindow = wMap.get(wId)!;
          const activeTab = tabsInWindow.find((t) => t.isActive) || tabsInWindow[0];
          const useSmartNaming = (preferences.smartWindowNaming as boolean) || false;

          // FAST-PATH: Direct Workspace property from server (No scanning!)
          const workspaceName = activeTab?.workspaceName;
          const count = tabsInWindow.length;

          let name = workspaceName || `Window ${index + 1}`;

          if (workspaceName) {
            // V1506: PRO-FORMATTING for Workspaces
            name = `${count} • ${workspaceName}`;
          } else if (useSmartNaming && count > 0) {
            name = `${count} • ${activeTab.displayTitle || activeTab.title}`;
          }

          if (name.length > 45) name = name.slice(0, 42) + "...";

          return { id: String(wId), name, tabCount: tabsInWindow.length };
        });
    });

    return {
      availableBrowsers: browsers,
      lastActiveBrowser: recentB || "browser",
      activeBrowserName:
        browsers.length === 1 ? browserNames[browsers[0]] || "Browser" : browserNames[recentB] || "All",
      totalTabsCount: allBrowsersTabs.length,
      browserIconMap: iconMap,
      windowsByBrowser,
    };
  }, [structuralVersion, memoizedMergedTabs.length]);

  // V89: FIX ACTION FLICKER - Stabilize availableBrowsers reference
  const prevAvail = useRef<string[]>([]);
  const stableAvailableBrowsers = useMemo(() => {
    if (
      availableBrowsers.length === prevAvail.current.length &&
      availableBrowsers.every((v, i) => v === prevAvail.current[i])
    ) {
      return prevAvail.current;
    }
    prevAvail.current = availableBrowsers;
    return availableBrowsers;
  }, [availableBrowsers]);

  const sessions = globalSessions || EMPTY_SESSIONS;
  const history = globalHistory || EMPTY_HISTORY;
  const bookmarks = globalBookmarks || EMPTY_BOOKMARKS;
  const downloads = globalDownloads || EMPTY_DOWNLOADS;

  return {
    extensionData,
    allDisplayTabs,
    normalSections,
    collapsedViewItems,
    isLoading: isTabsLoading,
    isConnecting,
    sessions,
    history,
    bookmarks,
    downloads,
    requestData: useCallback(
      (channel: string) => {
        sendToSocket({ type: "REQUEST_DATA", channel });
      },
      [sendToSocket],
    ),
    // V400: Subscription lifecycle — views call subscribe on mount, unsubscribe on unmount
    subscribe: useCallback(
      (channel: string) => {
        sendToSocket({ type: "START_SUBSCRIPTION", channel });
      },
      [sendToSocket],
    ),
    unsubscribe: useCallback(
      (channel: string) => {
        sendToSocket({ type: "STOP_SUBSCRIPTION", channel });
      },
      [sendToSocket],
    ),
    serverStatus,
    connectionError: null,
    socketRef,
    sendToSocket,
    reinitialize: useCallback(() => ensureConnection(0, true), []),
    serverDown,
    groups: useMemo(() => Object.values(extensionData?.groups || EMPTY_GROUPS), [extensionData?.groups]),
    unfilteredMergedTabs: memoizedMergedTabs,
    availableBrowsers: stableAvailableBrowsers,
    activeBrowserName,
    lastActiveBrowser,
    browserIconMap,
    windowsByBrowser,

    togglePin: useCallback(
      (tab: DisplayTab) => {
        sendToSocket({ type: "TOGGLE_PIN", tabId: tab.extId, currentPinned: !!tab.pinned });
        showToast(Toast.Style.Success, tab.pinned ? "Unpinned" : "Pinned");
      },
      [sendToSocket],
    ),
  };
}
