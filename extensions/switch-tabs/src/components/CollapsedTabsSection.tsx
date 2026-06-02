import React from "react";
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import {
  CollapsedListItem,
  DisplayTab,
  ExtensionGroup,
  BookmarkItem,
  BridgeMessage,
} from "../types";
import { TabItem } from "./TabItem";
import { GroupDetailView } from "./TabGroupView";
import { EditGroupForm } from "./EditGroupForm";
import { getTabGroupColor, getActionShortcut } from "../helpers";
import { SearchModeAction } from "./SearchModeToggle";
import { Image } from "@raycast/api";

interface CollapsedTabsSectionProps {
  collapsedViewItems: CollapsedListItem[];
  browserIconMap: Record<string, Image.Source>;
  activateTab: (tab: DisplayTab) => void;
  activateTabBackground: (tab: DisplayTab) => void;
  closeTab: (tab: DisplayTab) => void;
  moveTabToGroup: (tab: DisplayTab, groupId: string | number) => void;
  ungroupTab: (tab: DisplayTab) => void;
  createTabGroup: (
    tab: DisplayTab,
    title: string,
    color: string,
    tabIds?: string[],
  ) => void;
  updateTabGroup: (
    groupId: string | number,
    title: string,
    color: string,
  ) => void;
  discardTab: (tab: DisplayTab) => void;
  toggleMedia: (tab: DisplayTab) => void;
  seekMedia: (tab: DisplayTab, amount: number) => void;
  bookmarks: BookmarkItem[];
  groups: ExtensionGroup[];
  closeWindow: (windowId: string, browser?: string) => void;
  togglePin: (tab: DisplayTab) => void;
  toggleFocusMode: (tab: DisplayTab) => void;
  toggleFullscreen: (tab: DisplayTab) => void;
  refreshTab: (tab: DisplayTab) => void;
  renameTab: (tab: DisplayTab, title: string) => void;
  navigateTab: (tab: DisplayTab, newUrl: string) => void;
  createBookmark: (tab: DisplayTab, folderId: string) => void;
  ToggleAction: () => React.ReactElement;
  HistoryAction: () => React.ReactElement;
  SessionsAction: () => React.ReactElement;
  BookmarksAction: () => React.ReactElement;
  DownloadsAction: () => React.ReactElement;
  CycleBrowserAction: () => React.ReactElement | null;
  CycleWindowAction: () => React.ReactElement | null;
  WorkspacesAction: () => React.ReactElement;
  allTabs: DisplayTab[];
  sendToSocket: (msg: BridgeMessage) => void;
  changePlaybackRate: (tab: DisplayTab, direction: "up" | "down") => void;
  currentSearchMode?: "filter" | "search";
  setManualSearchMode?: (mode: "filter" | "search") => void;
  searchText?: string;
  setSearchText?: (text: string) => void;
}

interface FolderActionPanelProps {
  item: Extract<CollapsedListItem, { type: "folder" }>;
  activateTab: (tab: DisplayTab) => void;
  activateTabBackground: (tab: DisplayTab) => void;
  closeTab: (tab: DisplayTab) => void;
  moveTabToGroup: (tab: DisplayTab, groupId: string | number) => void;
  ungroupTab: (tab: DisplayTab) => void;
  createTabGroup: (
    tab: DisplayTab,
    title: string,
    color: string,
    tabIds?: string[],
  ) => void;
  discardTab: (tab: DisplayTab) => void;
  toggleMedia: (tab: DisplayTab) => void;
  seekMedia: (tab: DisplayTab, amount: number) => void;
  togglePin: (tab: DisplayTab) => void;
  toggleFocusMode: (tab: DisplayTab) => void;
  toggleFullscreen: (tab: DisplayTab) => void;
  refreshTab: (tab: DisplayTab) => void;
  renameTab: (tab: DisplayTab, title: string) => void;
  navigateTab: (tab: DisplayTab, newUrl: string) => void;
  createBookmark: (tab: DisplayTab, folderId: string) => void;
  closeWindow: (windowId: string, browser?: string) => void;
  allTabs: DisplayTab[];
  updateTabGroup: (
    groupId: string | number,
    title: string,
    color: string,
  ) => void;
  sendToSocket: (msg: BridgeMessage) => void;
  changePlaybackRate: (tab: DisplayTab, direction: "up" | "down") => void;
  ToggleAction: () => React.ReactElement;
  HistoryAction: () => React.ReactElement;
  SessionsAction: () => React.ReactElement;
  BookmarksAction: () => React.ReactElement;
  DownloadsAction: () => React.ReactElement;
  WorkspacesAction: () => React.ReactElement;
  CycleBrowserAction: () => React.ReactElement | null;
  CycleWindowAction: () => React.ReactElement | null;
  currentSearchMode?: "filter" | "search";
  setManualSearchMode?: (mode: "filter" | "search") => void;
  searchText?: string;
  setSearchText?: (text: string) => void;
}

const FolderActionPanel = React.memo((props: FolderActionPanelProps) => {
  const {
    item,
    activateTab,
    activateTabBackground,
    closeTab,
    moveTabToGroup,
    ungroupTab,
    createTabGroup,
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
    allTabs,
    updateTabGroup,
    sendToSocket,
    changePlaybackRate,
    ToggleAction,
    HistoryAction,
    SessionsAction,
    BookmarksAction,
    DownloadsAction,
    WorkspacesAction,
    CycleBrowserAction,
    CycleWindowAction,
    currentSearchMode,
    setManualSearchMode,
    searchText,
    setSearchText,
  } = props;

  return (
    <ActionPanel>
      <Action.Push
        title="Open Folder"
        icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
        target={
          <GroupDetailView
            folderId={item.id}
            type={
              (typeof item.id === "string" && item.id.includes("-")) ||
              typeof item.id === "number"
                ? "group"
                : "hostname"
            }
            title={item.title}
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
            createBookmark={createBookmark}
            closeWindow={closeWindow}
            historyAction={HistoryAction}
            sessionsAction={SessionsAction}
            bookmarksAction={BookmarksAction}
            downloadsAction={DownloadsAction}
            cycleBrowserAction={CycleBrowserAction}
            cycleWindowAction={CycleWindowAction}
            allTabs={allTabs}
            updateTabGroup={updateTabGroup}
            sendToSocket={sendToSocket}
            changePlaybackRate={changePlaybackRate}
            currentSearchMode={currentSearchMode}
            setManualSearchMode={setManualSearchMode}
          />
        }
      />
      <ToggleAction />
      <ActionPanel.Section title="Collection">
        <HistoryAction />
        <SessionsAction />
        <BookmarksAction />
        <DownloadsAction />
        <WorkspacesAction />
      </ActionPanel.Section>
      <ActionPanel.Section title="Switch Navigation">
        <CycleBrowserAction />
        <CycleWindowAction />
        {currentSearchMode && setManualSearchMode && (
          <SearchModeAction
            currentSearchMode={currentSearchMode}
            setManualSearchMode={setManualSearchMode}
            searchText={searchText}
            setSearchText={setSearchText}
          />
        )}
      </ActionPanel.Section>
      <Action.Push
        title="Edit Group"
        icon={{ source: Icon.Pencil, tintColor: Color.Orange }}
        shortcut={{ modifiers: ["ctrl"], key: "e" }}
        target={
          <EditGroupForm
            groupId={item.id}
            title={item.title}
            color={item.color || "grey"}
            browserType={item.browserType || "browser"}
            onUpdate={updateTabGroup}
          />
        }
      />
      <Action
        title="Close Window"
        icon={Icon.Window}
        style={Action.Style.Destructive}
        shortcut={
          getActionShortcut("closeWindow") || { modifiers: ["ctrl"], key: "x" }
        }
        onAction={() => {
          const firstTab = item.tabs[0];
          if (firstTab?.windowId) {
            closeWindow(firstTab.windowId, firstTab.browserType);
          }
        }}
      />
    </ActionPanel>
  );
});

export const CollapsedTabsSection = React.memo(
  (props: CollapsedTabsSectionProps) => {
    const {
      collapsedViewItems,
      browserIconMap,
      activateTab,
      activateTabBackground,
      closeTab,
      moveTabToGroup,
      ungroupTab,
      createTabGroup,
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
      ToggleAction,
      HistoryAction,
      SessionsAction,
      BookmarksAction,
      DownloadsAction,
      CycleBrowserAction,
      CycleWindowAction,
      WorkspacesAction,
      bookmarks,
      groups,
      closeWindow,
      allTabs,
      updateTabGroup,
      sendToSocket,
      changePlaybackRate,
      currentSearchMode,
      setManualSearchMode,
      searchText,
      setSearchText,
    } = props;

    return (
      <List.Section title="Folders and Tabs">
        {collapsedViewItems.map((item, index) =>
          item.type === "folder" ? (
            <List.Item
              key={`folder-${item.id}`}
              title={item.title}
              icon={{
                source:
                  (item.browserType && browserIconMap[item.browserType]) ||
                  Icon.Folder,
                tintColor: getTabGroupColor(item.color, item.browserType),
              }}
              accessories={[
                ...(item.isActive
                  ? [
                      {
                        icon: { source: Icon.Dot, tintColor: Color.Blue },
                        tooltip: "Active Tab inside",
                      },
                    ]
                  : []),
                { text: `${item.tabs.length} tabs` },
              ]}
              actions={<FolderActionPanel {...props} item={item} />}
            />
          ) : (
            <TabItem
              key={`tab-${item.tab.id}`}
              tab={item.tab}
              isActive={item.tab.isActive || false}
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
              closeWindow={closeWindow}
              allTabs={allTabs}
              updateTabGroup={updateTabGroup}
              sendToSocket={sendToSocket}
              changePlaybackRate={changePlaybackRate}
              currentSearchMode={currentSearchMode}
              setManualSearchMode={setManualSearchMode}
              searchText={searchText}
              setSearchText={setSearchText}
              isFirst={index === 0}
            />
          ),
        )}
      </List.Section>
    );
  },
);
