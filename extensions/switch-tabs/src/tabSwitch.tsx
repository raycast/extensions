// ─── TAB SWITCH COMMAND (DATA LAYER) ──────────────────────────────────────────
// This component handles data, state, and action wiring only.
// It does NOT re-render when the user types — that's handled by TabSwitchList.

import { showToast, Toast, getPreferenceValues, Icon } from "@raycast/api";
import { useState, useMemo, useCallback, useEffect } from "react";
import React from "react";
import { useBrowser, useViewReturn } from "./hooks/useBrowser";
import { notifyViewReturn, triggerMetadataSync } from "./context/BrowserStore";
import {
  usePersistentState,
  useFilterValidation,
} from "./hooks/useFilterState";
import { DisplayTab } from "./types";
import {
  ConnectionErrorView,
  ServerDownView,
} from "./components/TabSwitchStatusViews";
import { useTabActions } from "./hooks/useTabActions";
import { cache, getActionShortcut } from "./helpers";
import { TabSwitchList } from "./components/TabSwitchList";
import {
  CycleBrowserAction,
  CycleWindowAction,
  HistoryAction,
  SessionsAction,
  BookmarksAction,
  ToggleCollapseAction,
  DownloadsAction,
  WorkspacesAction,
} from "./components";

export default function Command() {
  const preferences = useMemo(() => getPreferenceValues(), []);
  const showWindowFilter = preferences.showWindowFilter as boolean;

  const state = usePersistentState();

  const [manualSearchMode, setManualSearchModeState] = useState<
    "filter" | "search"
  >(() => {
    const saved = cache.get("manual_search_mode");
    if (saved === "filter" || saved === "search") return saved;
    return "filter";
  });

  const setManualSearchMode = useCallback((mode: "filter" | "search") => {
    setManualSearchModeState(mode);
    cache.set("manual_search_mode", mode);
    showToast({
      style: Toast.Style.Success,
      title: mode === "filter" ? "Filter Tabs" : "Web Search",
      message: mode === "filter" ? "find tabs" : "suggestions",
    });
  }, []);

  const currentSearchMode = manualSearchMode;

  const {
    browserFilter,
    setBrowserFilter,
    currentWindowFilter,
    windowFilters,
    setWindowFilterForBrowser,
    includeAllWindows,
  } = state;

  const {
    allDisplayTabs,
    normalSections,
    collapsedViewItems,
    isLoading: isEdgeLoading,
    isConnecting,
    connectionError,
    sendToSocket,
    serverStatus,
    reinitialize,
    bookmarks,
    sessions: globalSessions,
    availableBrowsers,
    lastActiveBrowser,
    browserIconMap,
    windowsByBrowser,
    unfilteredMergedTabs,
    requestData,
    groups,
    activeBrowserName,
    serverDown,
  } = useBrowser("", browserFilter, currentWindowFilter, currentSearchMode);

  const viewReturnTick = useViewReturn();

  useFilterValidation(availableBrowsers, windowsByBrowser, state);

  useEffect(() => {
    triggerMetadataSync();
  }, [browserFilter, currentWindowFilter]);

  const groupsArray = groups;
  const [isCollapsed, setIsCollapsed] = useState(
    () => cache.get("browser_bridge_collapsed") === "true",
  );

  const browserTarget =
    browserFilter === "all" ? lastActiveBrowser : browserFilter;
  const windowTarget =
    currentWindowFilter === "all" ? undefined : currentWindowFilter;

  const {
    activateTab: originalActivateTab,
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
    closeWindow,
    createBookmark,
    toggleFocusMode,
    toggleFullscreen,
    renameTab,
    changePlaybackRate,
  } = useTabActions(sendToSocket, browserTarget, windowTarget);

  const activateTab = useCallback(
    (tab: DisplayTab) => originalActivateTab(tab),
    [originalActivateTab],
  );

  const moveBookmark = useCallback(
    (id: string, parentId: string) => {
      sendToSocket({ type: "MOVE_BOOKMARK", id, parentId });
      setTimeout(() => sendToSocket({ type: "REFRESH" }), 300);
      showToast(Toast.Style.Success, "Bookmark Moved");
    },
    [sendToSocket],
  );

  const renameBookmark = useCallback(
    (id: string, newTitle: string) => {
      sendToSocket({ type: "RENAME_BOOKMARK", id, title: newTitle });
      setTimeout(() => sendToSocket({ type: "REFRESH" }), 300);
    },
    [sendToSocket],
  );

  const ToggleAction = useCallback(
    () => (
      <ToggleCollapseAction
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
    ),
    [isCollapsed],
  );
  const HistoryActionComponent = useCallback(
    () => (
      <HistoryAction
        browserFilter={browserFilter}
        windowTarget={windowTarget}
        sendToSocket={sendToSocket}
        requestData={requestData}
        navigateCurrentTab={navigateCurrentTab}
        allTabs={unfilteredMergedTabs}
        onClose={notifyViewReturn}
      />
    ),
    [
      browserFilter,
      windowTarget,
      sendToSocket,
      requestData,
      navigateCurrentTab,
      unfilteredMergedTabs,
    ],
  );
  const SessionsActionComponent = useCallback(
    () => (
      <SessionsAction
        browserFilter={browserFilter}
        windowTarget={windowTarget}
        sendToSocket={sendToSocket}
        requestData={requestData}
        navigateCurrentTab={navigateCurrentTab}
        allTabs={unfilteredMergedTabs}
        onClose={notifyViewReturn}
      />
    ),
    [
      browserFilter,
      windowTarget,
      sendToSocket,
      requestData,
      navigateCurrentTab,
      unfilteredMergedTabs,
    ],
  );
  const BookmarksActionComponent = useCallback(
    () => (
      <BookmarksAction
        browserFilter={browserFilter}
        browserTarget={browserTarget}
        windowTarget={windowTarget}
        sendToSocket={sendToSocket}
        moveBookmark={moveBookmark}
        renameBookmark={renameBookmark}
        bookmarks={[]}
        requestData={requestData}
        navigateCurrentTab={navigateCurrentTab}
        allTabs={allDisplayTabs}
        onExit={notifyViewReturn}
      />
    ),
    [
      browserFilter,
      browserTarget,
      windowTarget,
      sendToSocket,
      moveBookmark,
      renameBookmark,
      requestData,
      navigateCurrentTab,
      allDisplayTabs,
    ],
  );
  const DownloadsActionComponent = useCallback(
    () => (
      <DownloadsAction
        downloads={[]}
        browserFilter={browserFilter}
        windowTarget={windowTarget}
        sendToSocket={sendToSocket}
        requestData={requestData}
        onClose={notifyViewReturn}
      />
    ),
    [browserFilter, windowTarget, sendToSocket, requestData],
  );
  const WorkspacesActionComponent = useCallback(
    () => <WorkspacesAction browserFilter={browserFilter} />,
    [browserFilter],
  );
  const CycleBrowserActionComponent = useCallback(
    () => (
      <CycleBrowserAction
        availableBrowsers={availableBrowsers}
        browserFilter={browserFilter}
        setBrowserFilter={setBrowserFilter}
        windowsByBrowser={windowsByBrowser}
        windowFilters={windowFilters}
        includeAllWindows={includeAllWindows}
        setWindowFilterForBrowser={setWindowFilterForBrowser}
        shortcut={
          getActionShortcut("cycleBrowser") || { modifiers: [], key: "`" }
        }
      />
    ),
    [
      availableBrowsers,
      browserFilter,
      setBrowserFilter,
      windowsByBrowser,
      windowFilters,
      includeAllWindows,
      setWindowFilterForBrowser,
    ],
  );
  const CycleWindowActionComponent = useCallback(
    () => (
      <CycleWindowAction
        browserFilter={browserFilter}
        windowsByBrowser={windowsByBrowser}
        currentWindowFilter={currentWindowFilter}
        includeAllWindows={includeAllWindows}
        setWindowFilterForBrowser={setWindowFilterForBrowser}
        shortcut={
          getActionShortcut("cycleWindow") || { modifiers: [], key: "tab" }
        }
      />
    ),
    [
      browserFilter,
      windowsByBrowser,
      currentWindowFilter,
      includeAllWindows,
      setWindowFilterForBrowser,
    ],
  );

  if (connectionError)
    return (
      <ConnectionErrorView
        error={connectionError}
        reinitialize={reinitialize}
      />
    );
  if (serverDown) return <ServerDownView onStarted={() => reinitialize()} />;

  return (
    <TabSwitchList
      isEdgeLoading={isEdgeLoading}
      isConnecting={isConnecting}
      serverStatus={serverStatus}
      availableBrowsers={availableBrowsers}
      browserFilter={browserFilter}
      setBrowserFilter={setBrowserFilter}
      showWindowFilter={showWindowFilter}
      windowsByBrowser={windowsByBrowser}
      currentWindowFilter={currentWindowFilter}
      setWindowFilterForBrowser={setWindowFilterForBrowser}
      includeAllWindows={includeAllWindows}
      currentSearchMode={currentSearchMode}
      setManualSearchMode={setManualSearchMode}
      activeBrowserName={activeBrowserName}
      allDisplayTabs={allDisplayTabs}
      normalSections={normalSections}
      collapsedViewItems={collapsedViewItems}
      browserIconMap={browserIconMap as Record<string, Icon | string>}
      groupsArray={groupsArray}
      bookmarks={bookmarks}
      activateTab={activateTab}
      activateTabBackground={activateTabBackground}
      closeTab={closeTab}
      moveTabToGroup={moveTabToGroup}
      ungroupTab={ungroupTab}
      updateTabGroup={updateTabGroup}
      createTabGroup={createTabGroup}
      discardTab={discardTab}
      toggleMedia={toggleMedia}
      seekMedia={seekMedia}
      togglePin={togglePin}
      toggleFocusMode={toggleFocusMode}
      toggleFullscreen={toggleFullscreen}
      refreshTab={refreshTab}
      navigateTab={navigateTab}
      createBookmark={createBookmark}
      closeWindow={closeWindow}
      renameTab={renameTab}
      changePlaybackRate={changePlaybackRate}
      ToggleAction={ToggleAction}
      HistoryActionComponent={HistoryActionComponent}
      SessionsActionComponent={SessionsActionComponent}
      BookmarksActionComponent={BookmarksActionComponent}
      DownloadsActionComponent={DownloadsActionComponent}
      WorkspacesActionComponent={WorkspacesActionComponent}
      CycleBrowserActionComponent={CycleBrowserActionComponent}
      CycleWindowActionComponent={CycleWindowActionComponent}
      unfilteredMergedTabs={unfilteredMergedTabs}
      sendToSocket={sendToSocket}
      browserTarget={browserTarget}
      windowTarget={windowTarget}
      navigateCurrentTab={navigateCurrentTab}
      globalSessions={globalSessions}
      viewReturnTick={viewReturnTick}
      isCollapsed={isCollapsed}
    />
  );
}
