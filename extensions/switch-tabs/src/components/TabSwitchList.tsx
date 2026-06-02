// ─── TAB SWITCH LIST (SEARCH LAYER) ───────────────────────────────────────────
// Manages high-frequency typing state (searchText).
// Parent (Command) stays completely still while the user types.

import {
  List,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import React from "react";
import { useSearch } from "../hooks/useWebSearch";
import { useLocalSearch } from "../hooks/useLocalSearch";
import { BROWSER_ICONS } from "../constants";
import { SearchBarFilter } from "./BrowserWindowFilter";
import { TabSwitchContent } from "./TabSwitchContent";
import { SearchResultsSection } from "./SearchResultsSection";
import { LuckyOnboardingView } from "./TabSwitchStatusViews";
import {
  DisplayTab,
  CollapsedListItem,
  ExtensionGroup,
  BookmarkItem,
  HistoryItem,
  BridgeMessage,
} from "../types";
import { SearchResult } from "../utils/searchTypes";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface MinimalBrowserWindow {
  id: string;
  name: string;
  tabCount: number;
}

export interface TabSwitchListProps {
  isEdgeLoading: boolean;
  isConnecting: boolean;
  serverStatus: string;
  availableBrowsers: string[];
  browserFilter: string;
  setBrowserFilter: (filter: string) => void;
  showWindowFilter: boolean;
  windowsByBrowser: Record<string, MinimalBrowserWindow[]>;
  currentWindowFilter: string;
  setWindowFilterForBrowser: (browser: string, filter: string) => void;
  includeAllWindows: boolean;
  WorkspacesActionComponent: () => React.ReactElement;
  currentSearchMode: "filter" | "search";
  setManualSearchMode: (mode: "filter" | "search") => void;
  activeBrowserName: string;
  allDisplayTabs: DisplayTab[];
  normalSections: Record<string, DisplayTab[]>;
  collapsedViewItems: CollapsedListItem[];
  viewReturnTick: number;
  isCollapsed: boolean;
  groupsArray: ExtensionGroup[];
  bookmarks: BookmarkItem[];
  browserIconMap: Record<string, Icon | string>;
  unfilteredMergedTabs: DisplayTab[];
  globalSessions: HistoryItem[];
  browserTarget: string;
  windowTarget?: string;
  changePlaybackRate: (tab: DisplayTab, direction: "up" | "down") => void;
  activateTab: (tab: DisplayTab) => void;
  activateTabBackground: (tab: DisplayTab) => void;
  closeTab: (tab: DisplayTab) => void;
  moveTabToGroup: (tab: DisplayTab, groupId: string | number) => void;
  ungroupTab: (tab: DisplayTab) => void;
  createTabGroup: (
    tab: DisplayTab,
    name: string,
    color: string,
    tabIds?: string[],
  ) => void;
  updateTabGroup: (
    groupId: string | number,
    name: string,
    color: string,
  ) => void;
  discardTab: (tab: DisplayTab) => void;
  toggleMedia: (tab: DisplayTab) => void;
  seekMedia: (tab: DisplayTab, amount: number) => void;
  togglePin: (tab: DisplayTab) => void;
  toggleFocusMode: (tab: DisplayTab) => void;
  toggleFullscreen: (tab: DisplayTab) => void;
  refreshTab: (tab: DisplayTab) => void;
  renameTab: (tab: DisplayTab, title: string) => void;
  navigateTab: (tab: DisplayTab, url: string, silent?: boolean) => void;
  createBookmark: (tab: DisplayTab, parentId: string) => void;
  closeWindow: (windowId: string, browser?: string) => void;
  ToggleAction: () => React.ReactElement;
  HistoryActionComponent: () => React.ReactElement;
  SessionsActionComponent: () => React.ReactElement;
  BookmarksActionComponent: () => React.ReactElement;
  DownloadsActionComponent: () => React.ReactElement;
  CycleBrowserActionComponent: () => React.ReactElement | null;
  CycleWindowActionComponent: () => React.ReactElement | null;
  sendToSocket: (msg: BridgeMessage) => void;
  navigateCurrentTab: (url: string, tabs: DisplayTab[]) => void;
}

export interface TabSwitchContentProps extends TabSwitchListProps {
  isLuckyOnboarding: boolean;
  isSearching: boolean;
  finalSearchResults: SearchResult[];
  searchText: string;
  setSearchText: (text: string) => void;
  isReturnPaint: boolean;
}

// ─── CLOCK HELPER ─────────────────────────────────────────────────────────────

function formatTime(format: string): string {
  const now = new Date();
  const h24 = now.getHours();
  const h12 = h24 % 12 || 12;
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const ampm = h24 < 12 ? "AM" : "PM";
  const ampmLower = h24 < 12 ? "am" : "pm";
  return format
    .replace("HH", String(h24).padStart(2, "0"))
    .replace("H", String(h24))
    .replace("hh", String(h12).padStart(2, "0"))
    .replace("h", String(h12))
    .replace("mm", mm)
    .replace("ss", ss)
    .replace("a", ampmLower)
    .replace("A", ampm);
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export const TabSwitchList = React.memo((props: TabSwitchListProps) => {
  const {
    isLoading: isSearchLoading,
    results: searchResults,
    searchText,
    setSearchText,
  } = useSearch();

  const titleBarContent = useMemo(() => {
    const prefs = getPreferenceValues();
    return (prefs.titleBarContent as string) || "time";
  }, []);

  const timeFormat = useMemo(() => {
    const prefs = getPreferenceValues();
    return (prefs.timeFormat as string) || "h:mm:ss a";
  }, []);

  const [clock, setClock] = useState(() => {
    if (titleBarContent !== "time") return "";
    return formatTime(timeFormat);
  });
  useEffect(() => {
    if (titleBarContent !== "time") return;
    const interval = setInterval(() => setClock(formatTime(timeFormat)), 1000);
    return () => clearInterval(interval);
  }, [titleBarContent, timeFormat]);

  const {
    isEdgeLoading,
    isConnecting,
    serverStatus,
    availableBrowsers,
    browserFilter,
    setBrowserFilter,
    showWindowFilter,
    windowsByBrowser,
    currentWindowFilter,
    setWindowFilterForBrowser,
    includeAllWindows,
    WorkspacesActionComponent,
    currentSearchMode,
    setManualSearchMode,
    activeBrowserName,
  } = props;

  const isSearchMode = currentSearchMode === "search";
  const isSearching = isSearchMode && searchText.trim().length > 0;
  const isLuckyOnboarding = isSearchMode && searchText === " ";
  const hasTabsToShow = props.allDisplayTabs && props.allDisplayTabs.length > 0;
  const isLoading = isSearching
    ? isSearchLoading
    : hasTabsToShow
      ? false
      : isEdgeLoading;

  const searchKeys = useMemo(() => {
    const prefs = getPreferenceValues();
    return {
      toggleKey: (prefs.searchToggleKey as string) || "/",
      clearKey: (prefs.clearSearchKey as string) || "'",
    };
  }, []);

  const handleSearchTextChange = useCallback(
    (text: string) => {
      const { toggleKey, clearKey } = searchKeys;
      if (text === toggleKey) {
        setManualSearchMode(
          currentSearchMode === "filter" ? "search" : "filter",
        );
        setSearchText("");
        return;
      }
      if (text.endsWith(clearKey)) {
        setSearchText("");
        showToast({
          style: Toast.Style.Success,
          title:
            currentSearchMode === "filter"
              ? "Filter cleared"
              : "Search cleared",
        });
        return;
      }
      if (text.endsWith(toggleKey)) {
        const before = text.slice(0, -toggleKey.length);
        setManualSearchMode(
          currentSearchMode === "filter" ? "search" : "filter",
        );
        setSearchText(before);
        return;
      }
      setSearchText(text);
    },
    [searchKeys, currentSearchMode, setManualSearchMode, setSearchText],
  );

  const [isReturnPaint, setIsReturnPaint] = useState(false);
  const wasSearching = useRef(false);

  useEffect(() => {
    if (!isSearching && wasSearching.current) {
      setIsReturnPaint(true);
      const timer = setTimeout(() => setIsReturnPaint(false), 100);
      return () => clearTimeout(timer);
    }
    wasSearching.current = isSearching;
  }, [isSearching]);

  const searchBarPlaceholder = useMemo(() => {
    if (serverStatus === "WAITING") return "Waiting for Browser Data...";
    if (isConnecting) return "Connecting to Extension...";
    if (availableBrowsers.length === 0) return "Connected | No Tabs";
    const modeName = isSearchMode ? "Web Search" : "Filter Tabs";
    return `${modeName} | ${activeBrowserName}`;
  }, [
    serverStatus,
    isConnecting,
    availableBrowsers,
    isSearchMode,
    activeBrowserName,
  ]);

  const { finalSearchResults } = useLocalSearch(
    searchText,
    searchResults,
    props.browserTarget,
  );

  // ─── SEARCH MODE: pure isolation — zero tab data on keystrokes ────────────
  // When actively searching, render SearchResultsSection directly.
  // tabListProps is never built, TabSwitchContent never touched.
  const searchProps = useMemo(
    () => ({
      activateTab: props.activateTab,
      activateTabBackground: props.activateTabBackground,
      closeTab: props.closeTab,
      closeWindow: props.closeWindow,
      togglePin: props.togglePin,
      toggleFocusMode: props.toggleFocusMode,
      toggleFullscreen: props.toggleFullscreen,
      renameTab: props.renameTab,
      navigateCurrentTab: props.navigateCurrentTab,
      allDisplayTabs: props.unfilteredMergedTabs,
      browserTarget: props.browserTarget,
      windowTarget: props.windowTarget,
      sendToSocket: props.sendToSocket,
      BookmarksAction: props.BookmarksActionComponent,
      HistoryAction: props.HistoryActionComponent,
      SessionsAction: props.SessionsActionComponent,
      DownloadsAction: props.DownloadsActionComponent,
      WorkspacesAction: props.WorkspacesActionComponent,
      CycleBrowserAction: props.CycleBrowserActionComponent,
      CycleWindowAction: props.CycleWindowActionComponent,
      changePlaybackRate: props.changePlaybackRate,
      currentSearchMode,
      setManualSearchMode,
    }),
    // Only rebuild when actions/targets change — NOT on keystrokes
    [
      props.activateTab,
      props.activateTabBackground,
      props.closeTab,
      props.closeWindow,
      props.togglePin,
      props.toggleFocusMode,
      props.toggleFullscreen,
      props.renameTab,
      props.navigateCurrentTab,
      props.unfilteredMergedTabs,
      props.browserTarget,
      props.windowTarget,
      props.sendToSocket,
      props.BookmarksActionComponent,
      props.HistoryActionComponent,
      props.SessionsActionComponent,
      props.DownloadsActionComponent,
      props.WorkspacesActionComponent,
      props.CycleBrowserActionComponent,
      props.CycleWindowActionComponent,
      props.changePlaybackRate,
      currentSearchMode,
      setManualSearchMode,
    ],
  );

  // ─── FILTER MODE: full tab data props — only built when not searching ────────
  const tabListProps = useMemo(() => {
    // Skip expensive spread when in search mode — TabSwitchContent never renders then
    if (isSearching || isLuckyOnboarding) return null;
    return {
      ...props,
      isLuckyOnboarding,
      isSearching,
      finalSearchResults,
      searchText,
      setSearchText,
      isReturnPaint,
      WorkspacesActionComponent,
      currentSearchMode,
      setManualSearchMode,
    };
  }, [
    isSearching,
    isLuckyOnboarding,
    props.allDisplayTabs,
    props.normalSections,
    props.collapsedViewItems,
    props.isEdgeLoading,
    props.isConnecting,
    props.serverStatus,
    props.viewReturnTick,
    props.isCollapsed,
    props.groupsArray,
    props.bookmarks,
    props.browserIconMap,
    props.unfilteredMergedTabs,
    props.globalSessions,
    props.browserTarget,
    props.windowTarget,
    props.changePlaybackRate,
    finalSearchResults,
    searchText,
    setSearchText,
    isReturnPaint,
    WorkspacesActionComponent,
    currentSearchMode,
    setManualSearchMode,
  ]);

  const navigationTitle = useMemo(() => {
    if (titleBarContent === "nothing") return undefined;
    const modeLabel = isSearchMode ? "Web Search" : "Filter Tabs";
    if (titleBarContent === "time") return `${modeLabel} • ${clock}`;
    if (titleBarContent === "tabCount") {
      const tabCount = props.allDisplayTabs?.length ?? 0;
      const groupCount = props.groupsArray?.length ?? 0;
      const parts: string[] = [];
      if (tabCount > 0)
        parts.push(`${tabCount} ${tabCount === 1 ? "tab" : "tabs"}`);
      if (groupCount > 0)
        parts.push(`${groupCount} ${groupCount === 1 ? "group" : "groups"}`);
      return parts.length > 0
        ? `${modeLabel} • ${parts.join(" • ")}`
        : modeLabel;
    }
    return modeLabel;
  }, [
    titleBarContent,
    isSearchMode,
    clock,
    props.allDisplayTabs,
    props.groupsArray,
  ]);

  return (
    <List
      isLoading={isLoading}
      {...(navigationTitle !== undefined ? { navigationTitle } : {})}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder={searchBarPlaceholder}
      throttle={false}
      filtering={!isSearchMode}
      searchBarAccessory={
        availableBrowsers.length > 1 ||
        (showWindowFilter &&
          availableBrowsers.some(
            (b: string) => (windowsByBrowser[b] || []).length > 1,
          )) ? (
          <SearchBarFilter
            availableBrowsers={availableBrowsers}
            browserFilter={browserFilter}
            setBrowserFilter={setBrowserFilter}
            showWindowFilter={showWindowFilter}
            windowsByBrowser={windowsByBrowser}
            currentWindowFilter={currentWindowFilter}
            setWindowFilterForBrowser={setWindowFilterForBrowser}
            includeAllWindows={includeAllWindows}
            BROWSER_ICONS={BROWSER_ICONS}
          />
        ) : undefined
      }
    >
      {isLuckyOnboarding ? (
        <LuckyOnboardingView />
      ) : isSearching ? (
        <SearchResultsSection
          {...searchProps}
          searchResults={finalSearchResults}
          setSearchText={setSearchText}
        />
      ) : (
        tabListProps && <TabSwitchContent {...tabListProps} />
      )}
    </List>
  );
});
