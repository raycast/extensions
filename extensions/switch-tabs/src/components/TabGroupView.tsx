import { List, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { useBrowser } from "../hooks/useBrowser";
import { notifyViewReturn } from "../context/BrowserStore";
import { DisplayTab, BridgeMessage } from "../types";
import { TabItem } from "./TabItem";

interface GroupDetailViewProps {
  folderId: number | string;
  type: "group" | "hostname";
  title: string;
  activate: (tab: DisplayTab) => void;
  activateBackground: (tab: DisplayTab) => void;
  close: (tab: DisplayTab) => void;
  move: (tab: DisplayTab, groupId: string | number) => void;
  ungroup: (tab: DisplayTab) => void;
  createGroup: (tab: DisplayTab, groupName: string, color: string, tabIds?: string[]) => void;
  updateTabGroup: (groupId: string | number, title: string, color: string) => void;
  discard: (tab: DisplayTab) => void;
  toggleMedia: (tab: DisplayTab) => void;
  seekMedia: (tab: DisplayTab, amount: number) => void;
  togglePin: (tab: DisplayTab) => void;
  toggleFocusMode?: (tab: DisplayTab) => void;
  toggleFullscreen: (tab: DisplayTab) => void;
  refreshTab: (tab: DisplayTab) => void;
  rename: (tab: DisplayTab, title: string) => void;
  navigateTab: (tab: DisplayTab, url: string, silent?: boolean) => void;
  createBookmark: (tab: DisplayTab, folderId: string) => void;
  closeWindow: (windowId: string, browser?: string) => void;
  allTabs: DisplayTab[];
  historyAction?: () => React.ReactElement;
  sessionsAction?: () => React.ReactElement;
  bookmarksAction?: () => React.ReactElement;
  downloadsAction?: () => React.ReactElement;
  cycleBrowserAction?: () => React.ReactElement | null;
  cycleWindowAction?: () => React.ReactElement | null;
  sendToSocket: (msg: BridgeMessage) => void;
  changePlaybackRate: (tab: DisplayTab, direction: "up" | "down") => void;
  currentSearchMode?: "filter" | "search";
  setManualSearchMode?: (mode: "filter" | "search") => void;
}

export function GroupDetailView({
  folderId,
  type,
  title,
  activate,
  activateBackground,
  close,
  move,
  ungroup,
  createGroup,
  discard,
  toggleMedia,
  seekMedia,
  togglePin,
  toggleFocusMode,
  toggleFullscreen,
  refreshTab,
  rename,
  navigateTab,
  createBookmark,
  closeWindow,
  allTabs: parentAllTabs,
  historyAction,
  sessionsAction,
  bookmarksAction,
  downloadsAction,
  cycleBrowserAction,
  cycleWindowAction,
  updateTabGroup,
  changePlaybackRate,
  currentSearchMode,
  setManualSearchMode,
}: GroupDetailViewProps) {
  const [query, setQuery] = useState("");
  const { allDisplayTabs, groups, bookmarks, sendToSocket } = useBrowser("");

  // Force parent views to re-render AFTER this view fully unmounts
  useEffect(() => {
    showToast(Toast.Style.Success, `Mounted: ${title}`);
    return () => {
      showToast(Toast.Style.Success, `Unmounted: ${title}`);
      notifyViewReturn();
    };
  }, [title]);

  const folderTabs = useMemo(() => {
    if (type === "group") {
      // V55: String-safe comparison for browser-prefixed IDs
      return allDisplayTabs.filter((t) => String(t.groupId) === String(folderId));
    } else {
      // V55: Check if it's the hostname folder or generic "Ungrouped"
      return allDisplayTabs.filter((t) => {
        const isUngrouped = t.groupId === -1 || t.groupId === "-1";
        if (folderId === "Ungrouped") return isUngrouped && (!t.subtitle || t.subtitle === "");
        return isUngrouped && t.subtitle === folderId;
      });
    }
  }, [allDisplayTabs, folderId, type]);

  const { pop } = useNavigation();

  // Auto-exit if the group becomes empty (e.g. you closed the last tab in it)
  useEffect(() => {
    if (folderTabs.length === 0) {
      pop();
    }
  }, [folderTabs.length, pop]);

  const matches = useMemo(() => {
    return query
      ? folderTabs.filter((t: DisplayTab) => t.title.toLowerCase().includes(query.toLowerCase()))
      : folderTabs;
  }, [folderTabs, query]);

  return (
    <List navigationTitle={title} onSearchTextChange={setQuery} searchBarPlaceholder="Filter group...">
      {matches.map((tab: DisplayTab) => (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={tab.isActive || false}
          activate={activate}
          activateBackground={activateBackground}
          close={close}
          move={move}
          ungroup={ungroup}
          createGroup={createGroup}
          discard={discard}
          toggleMedia={toggleMedia}
          seekMedia={seekMedia}
          togglePin={togglePin}
          toggleFocusMode={toggleFocusMode || (() => {})}
          toggleFullscreen={toggleFullscreen}
          refreshTab={refreshTab}
          rename={rename}
          navigateTab={navigateTab}
          groups={groups}
          bookmarks={bookmarks}
          createBookmark={createBookmark}
          closeWindow={closeWindow}
          historyAction={historyAction}
          sessionsAction={sessionsAction}
          bookmarksAction={bookmarksAction}
          downloadsAction={downloadsAction}
          cycleBrowserAction={cycleBrowserAction}
          cycleWindowAction={cycleWindowAction}
          allTabs={allDisplayTabs || parentAllTabs}
          updateTabGroup={updateTabGroup}
          sendToSocket={sendToSocket}
          changePlaybackRate={changePlaybackRate}
          currentSearchMode={currentSearchMode}
          setManualSearchMode={setManualSearchMode}
          isFirst={matches.indexOf(tab) === 0}
        />
      ))}
    </List>
  );
}
