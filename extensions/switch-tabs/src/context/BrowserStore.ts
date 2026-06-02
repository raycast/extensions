import { WebSocket } from "ws";
import { Toast, showToast, updateCommandMetadata } from "@raycast/api";
import {
  ExtensionData,
  ExtensionTab,
  DisplayTab,
  BridgeMessage,
  ExtensionGroup,
  SearchInput,
  WorkspaceInfo,
  BookmarkItem,
  DownloadItem,
  HistoryItem,
} from "../types";
import { cache } from "../helpers";
import { mergeTabs } from "../utils/tabMerger";

// --- GLOBAL PERSISTENCE LAYER (CLIENT MODE V50) ---
export let globalSocket: WebSocket | null = null;
export let lastMessageTime: number = 0;
export let isConnectionInProgress = false;
let mediaNotifyTimeout: NodeJS.Timeout | null = null;

// V198: Lazy Initialization (Start with NULL to avoid blocking import)
export let globalExtensionData: ExtensionData | null = null;
export let globalWorkspacesRoster: WorkspaceInfo[] = []; // V2: Master list of workspace info (name/guid/color)
export let didLoadCache = false;

// V400: Version counter — React only re-renders when this bumps (prevents useless spread copies)
export let globalDataVersion = 0;
export let globalStructuralVersion = 0;
export let lastFlushedVersion = -1; // V405: Track to avoid redundant synchronous disk I/O

// ─── V2 Architecture: Independent Global State ───
// These heavy lists are no longer part of ExtensionData.
export let globalBookmarks: BookmarkItem[] = [];
export let globalDownloads: DownloadItem[] = [];
export let globalSessions: HistoryItem[] = [];
export let globalHistory: HistoryItem[] = [];
export const globalCustomTitles: Record<
  string,
  { title: string; url: string }
> = {}; // V515: URL-aware local tab renames

// V3 Optimize: O(1) Fast String Equality & Disk I/O Debounce
export let globalLastRawUpdate: string = "";
// V1200: GLOBAL OBJECT POOL
// We maintain the EXACT memory references for every tab.
// This prevents React from ever "flickering" during a data swap.
export const globalTabPool = new Map<string | number, DisplayTab>();
export let cacheDebounceTimeout: NodeJS.Timeout | null = null;

// ─── SERVER HEALTH CHECK ───
export let globalServerHealth: { browsers: number; uptime: number } | null =
  null;
export let globalServerChecked = false;

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch("http://127.0.0.1:19222/health", {
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        status: string;
        browsers: number;
        uptime: number;
      };
      globalServerHealth = { browsers: data.browsers, uptime: data.uptime };
      globalServerChecked = true;
      return true;
    }
    globalServerHealth = null;
    globalServerChecked = true;
    return false;
  } catch {
    globalServerHealth = null;
    globalServerChecked = true;
    return false;
  }
}

export function getOrLoadCache(): ExtensionData | null {
  if (globalExtensionData) return globalExtensionData;

  // --- LAYER 2: Raycast's Skinny Cache (instant synchronous fallback for Frame 1) ---
  try {
    const raw = cache.get("browser_bridge_skinny_cache");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.mergedTabs)) {
        const cacheAge = Date.now() - (parsed.timestamp || 0);
        const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
        if (cacheAge > CACHE_TTL_MS) {
          return null;
        }

        globalExtensionData = parsed;
        didLoadCache = true;

        // V1700: POOL SEEDING — populate globalTabPool from skinny cache so mergeTabs
        // hits the identity lock immediately on first open, skipping full enrichTab for unchanged tabs.
        if (Array.isArray(parsed.mergedTabs)) {
          parsed.mergedTabs.forEach((tab: DisplayTab) => {
            if (tab.id) globalTabPool.set(String(tab.id), tab);
          });
        }

        const cachedRoster = cache.get("workspaces_roster_cache");
        if (cachedRoster) {
          try {
            globalWorkspacesRoster = JSON.parse(cachedRoster);
          } catch {
            /* ignored */
          }
        }

        return globalExtensionData;
      }
    }
  } catch {
    console.error("Skinny cache load error:");
  }

  return null;
}

// V1100: PRE-HYDRATE - Load cache immediately on module boot!
getOrLoadCache();

// V900: Skinny Flush - Only saves the top 50 items to disk to ensure 0ms JSON.parse.
export function flushCacheNow() {
  if (cacheDebounceTimeout) clearTimeout(cacheDebounceTimeout);

  if (globalExtensionData && globalExtensionData.mergedTabs) {
    try {
      // V1405: CACHE SIZE MONITORING
      // If the cache is getting close to the Raycast limit, do a deep wipe of everything non-essential.
      const skinny = {
        tabs: globalExtensionData.tabs.slice(0, 40),
        groups: globalExtensionData.groups,
        mergedTabs: globalExtensionData.mergedTabs.slice(0, 40),
        timestamp: Date.now(),
      };

      const skinnyJson = JSON.stringify(skinny);

      // If this one key is over 2.5MB, we are in the danger zone for Raycast storage limits.
      if (skinnyJson.length > 2_500_000) {
        console.log("[GC] Cache Danger Zone! Performing deep clean...");
        cache.remove("browser_bridge_skinny_cache");
        cache.remove("workspaces_roster_cache");
        // Only save a very tiny version (top 5) to recover space
        const emergencySkinny = {
          tabs: globalExtensionData.tabs.slice(0, 5),
          groups: {},
          mergedTabs: globalExtensionData.mergedTabs.slice(0, 5),
          timestamp: Date.now(),
        };
        cache.set(
          "browser_bridge_skinny_cache",
          JSON.stringify(emergencySkinny),
        );
      } else {
        cache.set("browser_bridge_skinny_cache", skinnyJson);
      }

      // V2: Persist workspaces roster
      if (globalWorkspacesRoster.length > 0) {
        cache.set(
          "workspaces_roster_cache",
          JSON.stringify(globalWorkspacesRoster),
        );
      }
    } catch (e) {
      console.error("[GC] Cache Flush Error:", e);
    }
    lastFlushedVersion = globalDataVersion;
  }
}

export const listeners: Set<() => void> = new Set();
const EMPTY_BOOKMARKS: BookmarkItem[] = [];
const EMPTY_SESSIONS: HistoryItem[] = [];
const EMPTY_DOWNLOADS: DownloadItem[] = [];
const EMPTY_HISTORY: HistoryItem[] = [];
export const EMPTY_GROUPS: Record<string | number, ExtensionGroup> = {};

// V3000: GRANULAR LISTENER DECOUPLING
// Dedicated listener sets for pushed views so media ticks / tab updates
// never trigger useless re-renders inside Bookmarks, Downloads, History, or Sessions.
const bookmarksListeners: Set<(bookmarks: BookmarkItem[]) => void> = new Set();
const downloadsListeners: Set<(downloads: DownloadItem[]) => void> = new Set();
const historyListeners: Set<(history: HistoryItem[]) => void> = new Set();
const sessionsListeners: Set<(sessions: HistoryItem[]) => void> = new Set();

const workspacesListeners: Set<(workspaces: WorkspaceInfo[]) => void> =
  new Set();
const tabsListeners: Set<(tabs: DisplayTab[]) => void> = new Set();
const groupsListeners: Set<
  (groups: Record<string | number, ExtensionGroup>) => void
> = new Set();

export function subscribeToWorkspaces(
  callback: (workspaces: WorkspaceInfo[]) => void,
) {
  workspacesListeners.add(callback);
  return () => workspacesListeners.delete(callback);
}

export function subscribeToTabs(callback: (tabs: DisplayTab[]) => void) {
  tabsListeners.add(callback);
  return () => tabsListeners.delete(callback);
}

export function subscribeToGroups(
  callback: (groups: Record<string | number, ExtensionGroup>) => void,
) {
  groupsListeners.add(callback);
  return () => groupsListeners.delete(callback);
}

export function getCurrentWorkspaces(): WorkspaceInfo[] {
  return globalWorkspacesRoster;
}
export function getCurrentTabs() {
  return globalExtensionData?.mergedTabs || [];
}
export function getCurrentGroups() {
  return globalExtensionData?.groups || EMPTY_GROUPS;
}

function notifyWorkspacesListeners(workspaces: WorkspaceInfo[]) {
  workspacesListeners.forEach((l) => {
    try {
      l(workspaces);
    } catch {
      workspacesListeners.delete(l);
    }
  });
}

function notifyTabsListeners(tabs: DisplayTab[]) {
  tabsListeners.forEach((l) => {
    try {
      l(tabs);
    } catch {
      tabsListeners.delete(l);
    }
  });
}

function notifyGroupsListeners(
  groups: Record<string | number, ExtensionGroup>,
) {
  groupsListeners.forEach((l) => {
    try {
      l(groups);
    } catch {
      groupsListeners.delete(l);
    }
  });
}

export let lastCommandMountTime = 0;

export function updateCommandMountTime() {
  lastCommandMountTime = Date.now();
}

export function notifyListeners(isMediaUpdate = false) {
  // V1403: Media Update Throttling
  if (isMediaUpdate) {
    // If the command mounted less than 1000ms ago, ignore media updates to prevent startup render lag.
    if (Date.now() - lastCommandMountTime < 1000) {
      return;
    }

    if (mediaNotifyTimeout) return;
    mediaNotifyTimeout = setTimeout(() => {
      mediaNotifyTimeout = null;
      notifyListeners(false);
    }, 350); // Throttle media ticking to 350ms for buttery-smooth UI
    return;
  }

  listeners.forEach((l) => {
    try {
      l();
    } catch {
      listeners.delete(l);
    }
  });

  // Notify granular listeners for pushed views
  // V2: THREADING - Only notify Workspaces if this is NOT a pure media progress tick
  if (globalExtensionData && !isMediaUpdate) {
    notifyTabsListeners(globalExtensionData.mergedTabs || []);
    notifyGroupsListeners(globalExtensionData.groups);
  }

  // V1420: Root Sync — only on structural changes, not media ticks
  if (!isMediaUpdate) {
    syncRootMetadata();
  }
}

/**
 * Triggers an immediate metadata sync (used when the dropdown selection changes)
 */
export function triggerMetadataSync() {
  syncRootMetadata();
}

let metadataSyncTimeout: NodeJS.Timeout | null = null;

function syncRootMetadata() {
  if (!globalExtensionData || !globalExtensionData.mergedTabs) return;

  // V30: ZERO-IPC Throttled Sync
  // updateCommandMetadata is an IPC call that doesn't need to fire on every micro-update.
  if (metadataSyncTimeout) return;
  metadataSyncTimeout = setTimeout(() => {
    metadataSyncTimeout = null;
    performSync();
  }, 200);
}

function performSync() {
  if (!globalExtensionData || !globalExtensionData.mergedTabs) return;

  // 1. Read persistent filters from cache (Zero-latency access)
  const browserFilter = cache.get("browser_filter") || "all";
  const savedWindowFilters = cache.get("window_filters");
  const windowFilters = savedWindowFilters
    ? JSON.parse(savedWindowFilters)
    : {};
  const windowFilter = windowFilters[browserFilter] || "all";

  const tabs = globalExtensionData.mergedTabs;

  // 2. Identify the currently focused window context
  const focusedTab = tabs.find((t) => t.windowFocused);

  // 3. Hierarchical Focus Logic
  const activeBrowser =
    browserFilter === "all"
      ? focusedTab
        ? focusedTab.browserType
        : "all"
      : browserFilter;
  const activeWindow =
    windowFilter === "all"
      ? focusedTab
        ? focusedTab.windowId
        : "all"
      : windowFilter;

  const activeTabs = tabs.filter((t) => {
    const bMatch = activeBrowser === "all" || t.browserType === activeBrowser;
    const wMatch = activeWindow === "all" || t.windowId === activeWindow;
    return bMatch && wMatch;
  });

  const tabsCount = activeTabs.length;
  const activeGroupIds = new Set(
    activeTabs
      .map((t) => t.groupId)
      .filter((id) => id !== undefined && id !== -1 && id !== ""),
  );
  const groupsCount = activeGroupIds.size;

  const parts: string[] = [];
  if (tabsCount > 0)
    parts.push(`${tabsCount} ${tabsCount === 1 ? "tab" : "tabs"}`);
  if (groupsCount > 0)
    parts.push(`${groupsCount} ${groupsCount === 1 ? "group" : "groups"}`);

  updateCommandMetadata({
    subtitle: parts.join(" • "),
  });
}

// V300: View Return Rendering Trigger
// Used to force native list items to remount when returning from a pushed view,
// without remounting the parent <List> (which prevents dropdown bugs).
export const viewReturnListeners = new Set<() => void>();
export const snapshotListeners = new Set<
  (msg: { tabId: string | number; snapshot: string | null }) => void
>();
export const searchTargetingListeners = new Set<
  (msg: { tabId: string | number; inputs: SearchInput[] }) => void
>();

export function notifyViewReturn() {
  viewReturnListeners.forEach((l) => l());
  if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
    globalSocket.send(JSON.stringify({ type: "REFRESH" }));
  }
}

// Connection Manager (Ghost Client)
export function ensureConnection(retryCount = 0, force = false) {
  if (isConnectionInProgress && !force) return;
  if (globalSocket && globalSocket.readyState === WebSocket.OPEN && !force)
    return;

  isConnectionInProgress = true;
  const ws = new WebSocket("ws://127.0.0.1:19222");

  ws.on("open", () => {
    isConnectionInProgress = false;
    globalSocket = ws;
    lastMessageTime = Date.now();

    // V51: Register as a Raycast client — the bridge sends sticky state on REGISTER
    ws.send(JSON.stringify({ type: "REGISTER", client: "raycast" }));
    // V400: Removed ws.send(REFRESH) — bridge already sends sticky state on REGISTER.
    // V1401: Clean pool on fresh registration to prevent stale tab ghosting
    if (force) globalTabPool.clear();

    notifyListeners();
  });

  ws.on("message", (data) => {
    lastMessageTime = Date.now();
    const rawString = data.toString();

    // V3: O(1) Fast Equality — bypass heavy JSON.parse for identical UPDATEs!
    if (rawString === globalLastRawUpdate && rawString.length > 50) {
      // V406: Even if data is identical, we MUST notify React so it knows we are fully CONNECTED.
      // Otherwise, during rapid restarts, the UI gets stuck in a blank loading screen.
      notifyListeners();
      return;
    }

    try {
      const msg = JSON.parse(rawString) as BridgeMessage;
      if (msg.type === "UPDATE" && msg.tabs && msg.groups) {
        globalLastRawUpdate = rawString.length < 512_000 ? rawString : "";

        // V2: Fast-path for workspaces roster in master payload
        if (Array.isArray(msg.workspaces)) {
          const newRosterStr = JSON.stringify(msg.workspaces);
          if (newRosterStr !== JSON.stringify(globalWorkspacesRoster)) {
            globalWorkspacesRoster = msg.workspaces;
            notifyWorkspacesListeners(globalWorkspacesRoster);
          }
        }

        const groupMap: Record<string | number, ExtensionGroup> = {};
        const updateBrowserType = msg.browserType;

        msg.tabs.forEach((t: ExtensionTab) => {
          if (!t.browserType && updateBrowserType)
            t.browserType = updateBrowserType as ExtensionTab["browserType"];
        });
        msg.groups.forEach((g: ExtensionGroup) => {
          if (!g.browserType && updateBrowserType)
            g.browserType = updateBrowserType as ExtensionGroup["browserType"];
          groupMap[g.id] = g;
        });
        if (msg.downloads) {
          msg.downloads.forEach((d: DownloadItem) => {
            if (!d.browserType && updateBrowserType)
              d.browserType = updateBrowserType;
          });
        }

        const newExtensionData: ExtensionData = {
          tabs: msg.tabs,
          groups: groupMap,
        };

        // V500: Smart-Merge (WebSocket)
        const tabCount = msg.tabs.length;
        if (tabCount > 40) {
          newExtensionData.mergedTabs = mergeTabs(newExtensionData, 40, true);
          globalExtensionData = newExtensionData;
          globalDataVersion++;
          globalStructuralVersion++;
          notifyListeners();

          setTimeout(() => {
            if (globalExtensionData) {
              globalExtensionData.mergedTabs = mergeTabs(globalExtensionData);
              globalDataVersion++;
              notifyListeners();
            }
          }, 50);
        } else {
          newExtensionData.mergedTabs = mergeTabs(newExtensionData);
          globalExtensionData = newExtensionData;
          globalDataVersion++;
          globalStructuralVersion++;
          notifyListeners();
        }

        // V1400: PRUNE CUSTOM TITLES (GC)
        // If we have a rename for a tab ID that is no longer in the alive list, kill it.
        const aliveIds = new Set(msg.tabs.map((t) => String(t.id)));
        Object.keys(globalCustomTitles).forEach((tid) => {
          if (!aliveIds.has(tid)) {
            delete globalCustomTitles[tid];
          }
        });

        // V400: Debounced Disk I/O with timestamp for freshness tracking
        if (cacheDebounceTimeout) clearTimeout(cacheDebounceTimeout);
        cacheDebounceTimeout = setTimeout(() => {
          flushCacheNow();
        }, 1000);
      } else if (msg.type === "BOOKMARKS_UPDATE" && msg.bookmarks) {
        // ─── V3000: DECOUPLED BOOKMARKS NOTIFY ───
        globalBookmarks = msg.bookmarks;
        bookmarksListeners.forEach((l) => {
          try {
            l(globalBookmarks);
          } catch {
            bookmarksListeners.delete(l);
          }
        });
      } else if (msg.type === "DOWNLOADS_UPDATE" && msg.downloads) {
        // ─── V3000: DECOUPLED DOWNLOADS NOTIFY ───
        globalDownloads = (msg.downloads || []).slice(0, 25);
        downloadsListeners.forEach((l) => {
          try {
            l(globalDownloads);
          } catch {
            downloadsListeners.delete(l);
          }
        });
      } else if (msg.type === "SESSIONS_UPDATE" && msg.sessions) {
        // ─── V3000: DECOUPLED SESSIONS NOTIFY ───
        globalSessions = (msg.sessions || []).slice(0, 500);
        sessionsListeners.forEach((l) => {
          try {
            l(globalSessions);
          } catch {
            sessionsListeners.delete(l);
          }
        });
      } else if (msg.type === "HISTORY_UPDATE" && msg.history) {
        // ─── V3000: DECOUPLED HISTORY NOTIFY ───
        globalHistory = (msg.history || []).slice(0, 500);
        historyListeners.forEach((l) => {
          try {
            l(globalHistory);
          } catch {
            historyListeners.delete(l);
          }
        });
      } else if (msg.type === "MEDIA_SYNC") {
        // Zero-allocation silent time correction hook
        if (
          msg.tabs &&
          Array.isArray(msg.tabs) &&
          globalExtensionData &&
          globalExtensionData.mergedTabs
        ) {
          msg.tabs.forEach((syncTab: ExtensionTab) => {
            const rawTab = globalExtensionData!.tabs.find(
              (t) => t.id === syncTab.id,
            );
            if (rawTab) {
              if (syncTab.currentTime !== undefined)
                rawTab.currentTime = syncTab.currentTime;
              if (syncTab.duration !== undefined)
                rawTab.duration = syncTab.duration;
              if (syncTab.playbackRate !== undefined)
                rawTab.playbackRate = syncTab.playbackRate;
            }
            const mergedTab = globalExtensionData!.mergedTabs!.find(
              (t) => t.id === syncTab.id,
            );
            if (mergedTab) {
              if (syncTab.currentTime !== undefined)
                mergedTab.currentTime = syncTab.currentTime;
              if (syncTab.duration !== undefined)
                mergedTab.duration = syncTab.duration;
              if (syncTab.playbackRate !== undefined) {
                mergedTab.playbackRate = syncTab.playbackRate;
              }
            }
          });
          // Note: NO notifyListeners() or data version bumps here to prevent memory leaks/UI lag
        }
      } else if (msg.type === "MEDIA_STATUS" || msg.type === "SEEK_COMPLETE") {
        // V3: O(1) Smooth mutable update - No array recreation overhead
        if (globalExtensionData && globalExtensionData.mergedTabs) {
          const tabIndex = globalExtensionData.tabs.findIndex(
            (t) => t.id === msg.tabId,
          );
          if (tabIndex !== -1) {
            const oldTab = globalExtensionData.tabs[tabIndex];
            const pausedChanged = oldTab.paused !== msg.paused;

            oldTab.currentTime = msg.currentTime || 0;
            oldTab.duration = msg.duration || 0;
            if (msg.paused !== undefined) oldTab.paused = msg.paused;
            if (msg.playbackRate !== undefined) {
              oldTab.playbackRate = msg.playbackRate;
            }

            // Also mutate the merged tab
            const mergedTab = globalExtensionData.mergedTabs.find(
              (t) => t.id === msg.tabId,
            );
            if (mergedTab) {
              mergedTab.currentTime = msg.currentTime || 0;
              mergedTab.duration = msg.duration || 0;
              if (msg.paused !== undefined) mergedTab.paused = msg.paused;
              if (msg.playbackRate !== undefined)
                mergedTab.playbackRate = msg.playbackRate;
            }

            // If play/pause state changed or it's a seek complete, bypass the throttle/ignore for instant feedback.
            if (pausedChanged || msg.type === "SEEK_COMPLETE") {
              notifyListeners(false);
            } else {
              notifyListeners(true);
            }
          }
        }
      } else if (msg.type === "TAB_SNAPSHOT") {
        snapshotListeners.forEach((l) =>
          l(
            msg as BridgeMessage & {
              tabId: string | number;
              snapshot: string | null;
            },
          ),
        );
      } else if (msg.type === "SEARCH_INPUTS_FOUND") {
        searchTargetingListeners.forEach((l) =>
          l(
            msg as BridgeMessage & {
              tabId: string | number;
              inputs: SearchInput[];
            },
          ),
        );
      } else if (msg.type === "WORKSPACES_ROSTER" && msg.workspaces) {
        const workspaces = msg.workspaces;
        globalWorkspacesRoster = workspaces;
        notifyWorkspacesListeners(workspaces);
      } else if (msg.type === "ERROR") {
        showToast(Toast.Style.Failure, msg.message || "Bridge Error");
      }
    } catch {
      /* ignored */
    }
  });

  ws.on("close", () => {
    isConnectionInProgress = false;
    globalSocket = null;
    notifyListeners();
  });

  ws.on("error", (e: Error & { code?: string }) => {
    isConnectionInProgress = false;
    globalSocket = null;
    notifyListeners();

    // Debugging Toasts
    const errCode = e.code || e.message || "Unknown Error";
    if (retryCount > 0 || force) {
      console.log("Connection Error:", errCode);
    }

    if (retryCount < 4) {
      // V105: Ultra-Aggressive startup retries (10ms -> 50ms -> 100ms -> 250ms)
      let delay = 10;
      if (retryCount === 1) delay = 50;
      else if (retryCount === 2) delay = 100;
      else if (retryCount === 3) delay = 250;

      setTimeout(() => ensureConnection(retryCount + 1), delay);
    }
  });
}

// V900: Eager Connection Handshake
// Start connecting the moment the module loads, skipping the React mount delay.
ensureConnection();

export function updateTabPlaybackLocally(
  tabId: string | number,
  delta: number,
) {
  if (!globalExtensionData) return;

  const rawTab = globalExtensionData.tabs.find((t) => t.id === tabId);
  if (rawTab && rawTab.currentTime !== undefined) {
    const newTime = Math.max(
      0,
      Math.min(rawTab.duration || 1000000, rawTab.currentTime + delta),
    );
    if (newTime !== rawTab.currentTime) {
      rawTab.currentTime = newTime;

      const mergedTab = globalExtensionData.mergedTabs?.find(
        (t) => t.id === tabId,
      );
      if (mergedTab) {
        mergedTab.currentTime = newTime;
      }

      globalDataVersion++;
      notifyListeners(true);

      lastFlushedVersion = -1;
    }
  }
}

export function renameTabLocally(
  tabId: string,
  newTitle: string,
  url?: string,
) {
  if (newTitle && newTitle.trim() !== "") {
    globalCustomTitles[tabId] = { title: newTitle, url: url || "" };
  } else {
    delete globalCustomTitles[tabId];
  }

  if (globalExtensionData) {
    globalExtensionData.mergedTabs = mergeTabs(globalExtensionData);
    globalDataVersion++;
    globalStructuralVersion++;
    notifyListeners();
    lastFlushedVersion = -1;
  }
}

export function getStoredBrowserData() {
  return {
    extensionData: globalExtensionData,
  };
}

/**
 * V320: Live Bookmark Subscription
 * Allows pushed views (BookmarksView) to subscribe to bookmark data changes
 * without needing the full useBrowser hook.
 */
export function subscribeToBookmarks(
  callback: (bookmarks: BookmarkItem[]) => void,
): () => void {
  // V3000: Register to dedicated bookmarksListeners — NOT the main listeners set
  bookmarksListeners.add(callback);
  return () => {
    bookmarksListeners.delete(callback);
  };
}

export function getCurrentBookmarks(): BookmarkItem[] {
  return globalBookmarks || EMPTY_BOOKMARKS;
}

export function subscribeToDownloads(
  callback: (downloads: DownloadItem[]) => void,
): () => void {
  // V3000: Register to dedicated downloadsListeners — NOT the main listeners set
  downloadsListeners.add(callback);
  return () => {
    downloadsListeners.delete(callback);
  };
}

export function getCurrentDownloads(): DownloadItem[] {
  return globalDownloads || EMPTY_DOWNLOADS;
}

export function subscribeToHistory(
  callback: (history: HistoryItem[]) => void,
): () => void {
  // V3000: Register to dedicated historyListeners — NOT the main listeners set
  historyListeners.add(callback);
  return () => {
    historyListeners.delete(callback);
  };
}

export function getCurrentHistory(): HistoryItem[] {
  return globalHistory || EMPTY_HISTORY;
}

export function subscribeToSessions(
  callback: (sessions: HistoryItem[]) => void,
): () => void {
  // V3000: Register to dedicated sessionsListeners — NOT the main listeners set
  sessionsListeners.add(callback);
  return () => {
    sessionsListeners.delete(callback);
  };
}

export function getCurrentSessions(): HistoryItem[] {
  return globalSessions || EMPTY_SESSIONS;
}

export function subscribeToSnapshots(
  callback: (msg: {
    tabId: string | number;
    snapshot: string | null;
    cached?: boolean;
  }) => void,
): () => void {
  snapshotListeners.add(callback);
  return () => {
    snapshotListeners.delete(callback);
  };
}
