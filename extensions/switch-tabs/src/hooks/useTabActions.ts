import { useCallback, useRef, useEffect } from "react";
import { closeMainWindow, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { DisplayTab, BridgeMessage } from "../types";
import { getTabId } from "../helpers";
import { updateTabPlaybackLocally, renameTabLocally } from "../context/BrowserStore";

export function useTabActions(
  sendToSocket: (msg: BridgeMessage) => void,
  browserTarget?: string,
  windowTarget?: string,
) {
  // --- PERSISTENT TOAST STATE (for seeking) ---
  const seekToastRef = useRef<Toast | null>(null);
  const seekAmountRef = useRef(0);
  const seekTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleToastRef = useRef<Toast | null>(null);
  const toggleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
      if (toggleTimerRef.current) clearTimeout(toggleTimerRef.current);
      seekToastRef.current = null;
      toggleToastRef.current = null;
    };
  }, []);

  // --- UNIFIED DISPATCHER ---
  // To avoid 20+ useCallbacks and potential stale closures, we use one unified dispatcher
  const dispatch = useCallback(
    (actionType: string, payload: Partial<BridgeMessage>) => {
      sendToSocket({ type: actionType, ...payload });
    },
    [sendToSocket],
  );

  const activateTab = useCallback(
    async (tab: DisplayTab) => {
      const tabId = getTabId(tab);
      if (!tabId) return;
      await closeMainWindow({ clearRootSearch: true });
      dispatch("ACTIVATE_TAB", { tabId });
    },
    [dispatch],
  );

  const activateTabBackground = useCallback(
    (tab: DisplayTab) => {
      const tabId = getTabId(tab);
      if (tabId) dispatch("ACTIVATE_TAB_BACKGROUND", { tabId });
      showToast(Toast.Style.Success, `Switched to ${tab.displayTitle} in background`);
    },
    [dispatch],
  );

  const closeTab = useCallback(
    (tab: DisplayTab) => {
      const tabId = getTabId(tab);
      if (tabId) dispatch("CLOSE_TAB", { tabId });
    },
    [dispatch],
  );

  const moveTabToGroup = useCallback(
    (tab: DisplayTab, groupId: string | number) => {
      dispatch("MOVE_BY_MATCH", { url: tab.url, title: tab.title, groupId, tabId: getTabId(tab) });
      showToast(Toast.Style.Success, "Moved to Group");
    },
    [dispatch],
  );

  const ungroupTab = useCallback(
    (tab: DisplayTab) => {
      dispatch("UNGROUP_BY_MATCH", { url: tab.url, title: tab.title, tabId: getTabId(tab) });
      showToast(Toast.Style.Success, "Tab Ungrouped");
    },
    [dispatch],
  );

  const createTabGroup = useCallback(
    (tab: DisplayTab, groupName: string, color: string, tabIds?: string[]) => {
      dispatch("CREATE_TAB_GROUP", { url: tab.url, title: tab.title, groupName, color, tabId: getTabId(tab), tabIds });
      showToast(Toast.Style.Success, "Group Created");
    },
    [dispatch],
  );

  const updateTabGroup = useCallback(
    (groupId: string | number, name: string, color: string) => {
      dispatch("UPDATE_TAB_GROUP", { groupId, groupName: name, color });
      showToast(Toast.Style.Success, "Group Updated");
    },
    [dispatch],
  );

  const discardTab = useCallback(
    (tab: DisplayTab) => {
      dispatch("DISCARD_BY_MATCH", { url: tab.url, title: tab.title, tabId: getTabId(tab) });
      showToast(Toast.Style.Success, "Tab Discarded", "Memory released");
    },
    [dispatch],
  );

  const toggleMedia = useCallback(
    (tab: DisplayTab) => {
      const targetId = getTabId(tab);
      if (!targetId) {
        showToast(Toast.Style.Failure, "Cannot Find Tab ID", "Try refreshing the list");
        return;
      }
      const status = tab.audible ? "Media Paused" : "Media Played";
      showToast({ style: Toast.Style.Success, title: `${status}: ${tab.displayTitle}` });
      dispatch("TOGGLE_MEDIA", { tabId: targetId });
    },
    [dispatch],
  );

  const togglePin = useCallback(
    (tab: DisplayTab) => {
      const tabId = getTabId(tab);
      if (!tabId) {
        showToast(Toast.Style.Failure, "Cannot Find Tab ID", "Try refreshing the list");
        return;
      }
      showToast(Toast.Style.Success, !tab.pinned ? "Tab Pinned" : "Tab Unpinned");
      dispatch("TOGGLE_PIN", { tabId });
    },
    [dispatch],
  );

  const refreshTab = useCallback(
    (tab: DisplayTab) => {
      const tabId = getTabId(tab);
      if (!tabId) {
        showToast(Toast.Style.Failure, "Cannot Find Tab ID", "Try refreshing the list");
        return;
      }
      showToast({ style: Toast.Style.Success, title: `Refreshed: ${tab.displayTitle}` });
      dispatch("REFRESH_TAB", { tabId });
    },
    [dispatch],
  );

  const seekMedia = useCallback(
    (tab: DisplayTab, amount: number) => {
      const targetId = getTabId(tab);
      if (!targetId || tab.currentTime === undefined) return;

      seekAmountRef.current += amount;
      const absAmount = Math.abs(seekAmountRef.current);
      const title = `${seekAmountRef.current > 0 ? "+" : "-"}${absAmount}s`;
      const message = seekAmountRef.current > 0 ? "Seek" : "Rewind";

      if (seekToastRef.current) {
        seekToastRef.current.title = title;
        seekToastRef.current.message = message;
      } else {
        showToast({ style: Toast.Style.Success, title, message }).then((t) => {
          seekToastRef.current = t;
        });
      }

      // --- V511: Predictive UI (Speedometer Mode) ---
      // Instantly jump the local display time ONLY for paused/silent tabs.
      // Playing tabs effectively carry their own momentum via the background ticker.
      if (tab.paused || !tab.audible) {
        updateTabPlaybackLocally(targetId, amount);
      }

      // Debounce always on, 500ms hardcoded
      if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
      seekTimerRef.current = setTimeout(() => {
        if (seekAmountRef.current !== 0) {
          dispatch("SEEK_MEDIA", { tabId: targetId, amount: seekAmountRef.current });
        }
        seekToastRef.current = null;
        seekAmountRef.current = 0;
      }, 500);
    },
    [dispatch],
  );

  const navigateCurrentTab = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (targetUrl: string, allDisplayTabs?: DisplayTab[]) => {
      const preferences = getPreferenceValues();
      const inBackground = preferences.openInBackground;
      const payload: Partial<BridgeMessage> = { url: targetUrl, browser: browserTarget, windowId: windowTarget };

      if (inBackground) {
        payload.background = true;
        showToast(Toast.Style.Success, "Opening in Current Tab (Background)");
        dispatch("NAVIGATE_CURRENT", payload);
      } else {
        await closeMainWindow({ clearRootSearch: true });
        dispatch("NAVIGATE_CURRENT", payload);
      }
    },
    [dispatch, browserTarget, windowTarget],
  );

  const createTabBackground = useCallback(
    (url: string) => {
      dispatch("CREATE_TAB_BACKGROUND", { url, browser: browserTarget, windowId: windowTarget });
      showToast(Toast.Style.Success, "Opened in background");
    },
    [dispatch, browserTarget, windowTarget],
  );

  const closeWindow = useCallback(
    (windowId: string, browser?: string) => {
      dispatch("CLOSE_WINDOW", { windowId, browser });
      showToast(Toast.Style.Success, "Window Closed");
    },
    [dispatch],
  );

  const navigateTab = useCallback(
    (tab: DisplayTab, url: string, silent = false) => {
      const tabId = getTabId(tab);
      if (tabId) dispatch("NAVIGATE_TAB", { tabId, url, silent });
    },
    [dispatch],
  );

  // Wrapped actions for exports
  const createBookmark = useCallback(
    (tab: DisplayTab, parentId: string) => {
      dispatch("CREATE_BOOKMARK", { title: tab.title, url: tab.url, parentId });
      showToast(Toast.Style.Success, "Bookmark Added");
    },
    [dispatch],
  );

  const toggleFocusMode = useCallback(
    (tab: DisplayTab) => {
      const tabId = getTabId(tab);
      if (!tabId) return;
      if (tab.windowType === "popup") {
        dispatch("ATTACH_TAB", { tabId });
        showToast(Toast.Style.Success, "Tab Attached", "Moved back to main window");
      } else {
        dispatch("DETACH_TAB", { tabId });
        showToast(Toast.Style.Success, "Tab Detached", "Opened in Focus Mode");
      }
    },
    [dispatch],
  );

  const toggleFullscreen = useCallback(
    (tab: DisplayTab) => {
      const tabId = getTabId(tab);
      if (!tabId) return;
      const isCurrentlyFullscreen = tab.windowState === "fullscreen";
      showToast(Toast.Style.Success, isCurrentlyFullscreen ? "Exiting Fullscreen" : "Entering Fullscreen");
      dispatch("TOGGLE_FULLSCREEN", { tabId });
    },
    [dispatch],
  );

  const renameTab = useCallback(
    (tab: DisplayTab, newTitle: string) => {
      const tabId = getTabId(tab);
      if (!tabId) return;

      // 1. Instant UI update in Raycast (with URL for auto-clear on navigation)
      renameTabLocally(String(tabId), newTitle, tab.url);

      // 2. Browser-side rename
      dispatch("RENAME_TAB", { tabId, newTitle });
    },
    [dispatch],
  );

  const duplicateTab = useCallback(
    (tab: DisplayTab) => {
      const tabId = getTabId(tab);
      if (!tabId) return;
      dispatch("DUPLICATE_TAB", { tabId });
      showToast(Toast.Style.Success, "Tab Duplicated", tab.displayTitle);
    },
    [dispatch],
  );

  const changePlaybackRate = useCallback(
    (tab: DisplayTab, direction: "up" | "down") => {
      const tabId = getTabId(tab);
      if (!tabId) return;

      // V1614: Predictive Toast (for instant feedback)
      const currentRate = tab.playbackRate || 1.0;
      const rates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 3.0];
      let predictedRate = 1.0;
      if (direction === "up") {
        predictedRate = rates.find((r) => r > currentRate) || 3.0;
      } else {
        predictedRate = [...rates].reverse().find((r) => r < currentRate) || 0.25;
      }

      showToast(Toast.Style.Success, `Speed: ${predictedRate}x`, tab.displayTitle);

      // Still offload the actual logic to the browser to ensure source-of-truth sync
      dispatch("CHANGE_SPEED", { tabId, direction });
    },
    [dispatch],
  );

  return {
    activateTab,
    activateTabBackground,
    closeTab,
    moveTabToGroup,
    ungroupTab,
    createTabGroup,
    updateTabGroup,
    discardTab,
    toggleMedia,
    togglePin,
    refreshTab,
    seekMedia,
    navigateCurrentTab,
    navigateTab,
    createTabBackground,
    closeWindow,
    createBookmark,
    toggleFocusMode,
    toggleFullscreen,
    renameTab,
    duplicateTab,
    changePlaybackRate,
  };
}
