import React from "react";
import { List } from "@raycast/api";
import { DisplayTab, ExtensionGroup, HistoryItem, BookmarkItem, BridgeMessage } from "../types";
import { TabItem } from "./TabItem";

interface NormalTabsSectionProps {
  sections: Record<string, DisplayTab[]>;
  groups: ExtensionGroup[];
  bookmarks: BookmarkItem[];
  // Tab actions
  activateTab: (tab: DisplayTab) => void;
  activateTabBackground: (tab: DisplayTab) => void;
  closeTab: (tab: DisplayTab) => void;
  moveTabToGroup: (tab: DisplayTab, groupId: string | number) => void;
  ungroupTab: (tab: DisplayTab) => void;
  createTabGroup: (tab: DisplayTab, name: string, color: string, tabIds?: string[]) => void;
  updateTabGroup: (groupId: string | number, name: string, color: string) => void;
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
  allTabs: DisplayTab[];
  sessions: HistoryItem[];
  // Action components
  ToggleAction: () => React.ReactElement;
  HistoryAction: () => React.ReactElement;
  SessionsAction: () => React.ReactElement;
  BookmarksAction: () => React.ReactElement;
  DownloadsAction: () => React.ReactElement;
  CycleBrowserAction: () => React.ReactElement | null;
  CycleWindowAction: () => React.ReactElement | null;
  WorkspacesAction: () => React.ReactElement;
  sendToSocket: (msg: BridgeMessage) => void;
  changePlaybackRate: (tab: DisplayTab, direction: "up" | "down") => void;
  currentSearchMode?: "filter" | "search";
  setManualSearchMode?: (mode: "filter" | "search") => void;
  searchText?: string;
  setSearchText?: (text: string) => void;
}

export const NormalTabsSections = React.memo((props: NormalTabsSectionProps) => {
  const {
    sections,
    groups,
    bookmarks,
    activateTab,
    activateTabBackground,
    closeTab,
    moveTabToGroup,
    ungroupTab,
    createTabGroup,
    updateTabGroup,
    discardTab,
    toggleMedia,
    seekMedia,
    togglePin,
    toggleFocusMode,
    toggleFullscreen,
    refreshTab,
    renameTab,
    navigateTab,
    createBookmark,
    closeWindow,
    ToggleAction,
    HistoryAction,
    SessionsAction,
    BookmarksAction,
    DownloadsAction,
    CycleBrowserAction,
    CycleWindowAction,
    WorkspacesAction,
    allTabs,
    sendToSocket,
    changePlaybackRate,
    currentSearchMode,
    setManualSearchMode,
    searchText,
    setSearchText,
  } = props;
  return (
    <>
      {Object.entries<DisplayTab[]>(sections).map(([sectionTitle, tabs], sectionIndex) => (
        <List.Section key={sectionTitle} title={sectionTitle}>
          {tabs.map((tab: DisplayTab, tabIndex: number) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isFirst={sectionIndex === 0 && tabIndex === 0}
              isActive={tab.isActive || false}
              activate={activateTab}
              activateBackground={activateTabBackground}
              close={closeTab}
              move={moveTabToGroup}
              ungroup={ungroupTab}
              createGroup={createTabGroup}
              discard={discardTab}
              toggleMedia={toggleMedia}
              seekMedia={seekMedia}
              togglePin={togglePin}
              toggleFocusMode={toggleFocusMode}
              toggleFullscreen={toggleFullscreen}
              refreshTab={refreshTab}
              rename={renameTab}
              navigateTab={navigateTab}
              groups={groups}
              closeWindow={closeWindow}
              toggleCollapse={ToggleAction}
              historyAction={HistoryAction}
              sessionsAction={SessionsAction}
              bookmarksAction={BookmarksAction}
              downloadsAction={DownloadsAction}
              cycleBrowserAction={CycleBrowserAction}
              cycleWindowAction={CycleWindowAction}
              workspacesAction={WorkspacesAction}
              bookmarks={bookmarks}
              createBookmark={createBookmark}
              allTabs={allTabs}
              updateTabGroup={updateTabGroup}
              sendToSocket={sendToSocket}
              changePlaybackRate={changePlaybackRate}
              currentSearchMode={currentSearchMode}
              setManualSearchMode={setManualSearchMode}
              searchText={searchText}
              setSearchText={setSearchText}
            />
          ))}
        </List.Section>
      ))}
    </>
  );
});
