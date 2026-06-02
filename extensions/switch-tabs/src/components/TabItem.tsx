import { ActionPanel, Action, List, Icon, Color, Toast, showToast, useNavigation } from "@raycast/api";
import { DisplayTab, ExtensionGroup, BookmarkItem, BridgeMessage, SearchInput } from "../types";
import { getTabGroupColor, formatTime, getActionShortcut, getTabIcon, forceCopy } from "../helpers";
import { CreateGroupForm } from "./CreateGroupForm";
import { TabSearchView } from "./WebSearchView";
import { TargetInputSearchView } from "./TargetInputSearchView";
import { BookmarkFolderPicker } from "./BookmarkFolderPicker";
import { TabPreview } from "./TabPreview";
import { RenameTabForm } from "./RenameTabForm";
import React, { useMemo } from "react";
import { searchTargetingListeners, globalSocket } from "../context/BrowserStore";
import { SearchModeAction } from "./SearchModeToggle";

interface TabItemProps {
  tab: DisplayTab;
  isActive: boolean;
  activate: (tab: DisplayTab) => void;
  activateBackground: (tab: DisplayTab) => void;
  close: (tab: DisplayTab) => void;
  move: (tab: DisplayTab, groupId: string | number) => void;
  ungroup: (tab: DisplayTab) => void;
  createGroup: (tab: DisplayTab, groupName: string, color: string) => void;
  updateTabGroup: (groupId: string | number, name: string, color: string) => void;
  discard: (tab: DisplayTab) => void;
  toggleMedia: (tab: DisplayTab) => void;
  seekMedia: (tab: DisplayTab, amount: number) => void;
  togglePin: (tab: DisplayTab) => void;
  toggleFocusMode: (tab: DisplayTab) => void;
  toggleFullscreen: (tab: DisplayTab) => void;
  refreshTab: (tab: DisplayTab) => void;
  rename: (tab: DisplayTab, title: string) => void;
  navigateTab: (tab: DisplayTab, url: string, silent?: boolean) => void;
  closeWindow: (windowId: string, browser?: string) => void;
  groups: ExtensionGroup[];
  allTabs: DisplayTab[];
  listVersion?: number;
  toggleCollapse?: () => React.ReactElement;
  historyAction?: () => React.ReactElement;
  sessionsAction?: () => React.ReactElement;
  bookmarks: BookmarkItem[];
  createBookmark: (tab: DisplayTab, folderId: string) => void;
  bookmarksAction?: () => React.ReactElement;
  downloadsAction?: () => React.ReactElement;
  cycleBrowserAction?: () => React.ReactElement | null;
  cycleWindowAction?: () => React.ReactElement | null;
  workspacesAction?: () => React.ReactElement;
  sendToSocket: (msg: BridgeMessage) => void;
  changePlaybackRate: (tab: DisplayTab, direction: "up" | "down") => void;
  isFirst?: boolean;
  currentSearchMode?: "filter" | "search";
  setManualSearchMode?: (mode: "filter" | "search") => void;
  searchText?: string;
  setSearchText?: (text: string) => void;
}

interface TabActionPanelProps {
  tab: DisplayTab;
  isActive: boolean;
  activate: (tab: DisplayTab) => void;
  activateBackground: (tab: DisplayTab) => void;
  close: (tab: DisplayTab) => void;
  move: (tab: DisplayTab, groupId: string | number) => void;
  ungroup: (tab: DisplayTab) => void;
  createGroup: (tab: DisplayTab, groupName: string, color: string) => void;
  updateTabGroup: (groupId: string | number, name: string, color: string) => void;
  discard: (tab: DisplayTab) => void;
  toggleMedia: (tab: DisplayTab) => void;
  seekMedia: (tab: DisplayTab, amount: number) => void;
  togglePin: (tab: DisplayTab) => void;
  toggleFocusMode: (tab: DisplayTab) => void;
  toggleFullscreen: (tab: DisplayTab) => void;
  refreshTab: (tab: DisplayTab) => void;
  rename: (tab: DisplayTab, title: string) => void;
  navigateTab: (tab: DisplayTab, url: string, silent?: boolean) => void;
  closeWindow: (windowId: string, browser?: string) => void;
  groups: ExtensionGroup[];
  allTabs: DisplayTab[];
  ToggleCollapse?: () => React.ReactElement;
  HistoryAction?: () => React.ReactElement;
  SessionsAction?: () => React.ReactElement;
  bookmarks: BookmarkItem[];
  createBookmark: (tab: DisplayTab, folderId: string) => void;
  BookmarksAction?: () => React.ReactElement;
  DownloadsAction?: () => React.ReactElement;
  CycleBrowserAction?: () => React.ReactElement | null;
  CycleWindowAction?: () => React.ReactElement | null;
  WorkspacesAction?: () => React.ReactElement;
  sendToSocket: (msg: BridgeMessage) => void;
  changePlaybackRate: (tab: DisplayTab, direction: "up" | "down") => void;
  seekSeconds: number;
  hasMedia: boolean;
  currentSearchMode?: "filter" | "search";
  setManualSearchMode?: (mode: "filter" | "search") => void;
  searchText?: string;
  setSearchText?: (text: string) => void;
}

const TabActionPanel = React.memo((props: TabActionPanelProps) => {
  const {
    tab,
    isActive,
    activate,
    activateBackground,
    close,
    closeWindow,
    groups,
    move,
    ungroup,
    createGroup,
    discard,
    toggleMedia,
    seekMedia,
    changePlaybackRate,
    togglePin,
    toggleFocusMode,
    toggleFullscreen,
    refreshTab,
    rename,
    navigateTab,
    ToggleCollapse,
    HistoryAction,
    SessionsAction,
    bookmarks,
    createBookmark,
    BookmarksAction,
    DownloadsAction,
    CycleBrowserAction,
    CycleWindowAction,
    WorkspacesAction,
    allTabs,
    sendToSocket,
    seekSeconds,
    hasMedia,
    currentSearchMode,
    setManualSearchMode,
    searchText,
    setSearchText,
  } = props;
  const { push } = useNavigation();

  return (
    <ActionPanel>
      <Action
        title="Switch to Tab"
        icon={{ source: Icon.ArrowRight, tintColor: Color.Blue }}
        onAction={() => activate(tab)}
        shortcut={getActionShortcut("switch")}
      />
      <Action
        title="Close Tab"
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        style={Action.Style.Destructive}
        onAction={() => close(tab)}
        shortcut={getActionShortcut("close")}
      />
      {!isActive && (
        <Action
          title="Switch to Tab (Background)"
          icon={{ source: Icon.Eye, tintColor: Color.Blue }}
          onAction={() => activateBackground(tab)}
          shortcut={currentSearchMode === "search" ? { modifiers: ["ctrl", "shift"], key: "enter" } : undefined}
        />
      )}
      <Action.Push
        title="Preview Tab"
        icon={{ source: Icon.Image, tintColor: Color.Blue }}
        shortcut={{ modifiers: ["ctrl"], key: "arrowRight" }}
        target={<TabPreview tab={tab} sendToSocket={sendToSocket} activate={activate} close={close} />}
      />

      {hasMedia && (
        <ActionPanel.Section title="Media Controls">
          <Action
            title="Play/Pause Media"
            icon={{ source: Icon.Play, tintColor: Color.Green }}
            shortcut={{ modifiers: ["ctrl"], key: "arrowLeft" }}
            onAction={() => toggleMedia(tab)}
          />
          <Action
            title={`Seek Forward (${seekSeconds} Seconds)`}
            icon={{ source: Icon.ChevronRight, tintColor: Color.Green }}
            shortcut={{ modifiers: [], key: "arrowRight" }}
            onAction={() => seekMedia(tab, seekSeconds)}
          />
          <Action
            title={`Seek Backward (${seekSeconds} Seconds)`}
            icon={{ source: Icon.ChevronLeft, tintColor: Color.Green }}
            shortcut={{ modifiers: [], key: "arrowLeft" }}
            onAction={() => seekMedia(tab, -seekSeconds)}
          />
          <Action
            title="Increase Speed"
            icon={{ source: Icon.PlusCircle, tintColor: Color.Green }}
            shortcut={{ modifiers: ["shift"], key: "." }}
            onAction={() => changePlaybackRate(tab, "up")}
          />
          <Action
            title="Decrease Speed"
            icon={{ source: Icon.MinusCircle, tintColor: Color.Green }}
            shortcut={{ modifiers: ["shift"], key: "," }}
            onAction={() => changePlaybackRate(tab, "down")}
          />
        </ActionPanel.Section>
      )}

      <ActionPanel.Section title="Tab Management">
        <Action.Push
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Purple }}
          title={`Search in Tab`}
          target={<TabSearchView tab={tab} navigateTab={navigateTab} />}
          shortcut={hasMedia ? { modifiers: ["shift"], key: "arrowRight" } : { modifiers: [], key: "arrowRight" }}
        />
        <Action
          icon={{ source: Icon.Terminal, tintColor: Color.Green }}
          title="Input Search in Active Tab"
          shortcut={hasMedia ? { modifiers: ["shift"], key: "arrowLeft" } : { modifiers: [], key: "arrowLeft" }}
          onAction={async () => {
            const targetTab =
              allTabs.find((t) => t.isActive && t.windowFocused) || allTabs.find((t) => t.isActive) || tab;
            const toast = await showToast({ style: Toast.Style.Animated, title: "Scanning Page..." });

            if (globalSocket && globalSocket.readyState === 1) {
              globalSocket.send(JSON.stringify({ type: "INIT_SEARCH_TARGETING", tabId: targetTab.id }));
            }

            const listener = (msg: { tabId: string | number; inputs: SearchInput[] }) => {
              if (String(msg.tabId) === String(targetTab.id)) {
                searchTargetingListeners.delete(listener);
                toast.hide();
                const prefill = msg.inputs?.[0]?.value || "";
                push(<TargetInputSearchView tab={targetTab} prefilledText={prefill} />);
              }
            };
            searchTargetingListeners.add(listener);
            setTimeout(() => {
              if (searchTargetingListeners.has(listener)) {
                searchTargetingListeners.delete(listener);
                toast.hide();
                push(<TargetInputSearchView tab={targetTab} />);
              }
            }, 2500);
          }}
        />
        <Action
          title={tab.windowType === "popup" ? "Re-Attach Tab" : "Focus Tab (Popup)"}
          icon={{ source: Icon.Desktop, tintColor: Color.Purple }}
          shortcut={{ modifiers: ["ctrl"], key: "o" }}
          onAction={() => toggleFocusMode(tab)}
        />
        <Action
          title={tab.windowState === "fullscreen" ? "Exit Fullscreen" : "Toggle Fullscreen"}
          icon={{ source: Icon.Maximize, tintColor: Color.Purple }}
          onAction={() => toggleFullscreen(tab)}
          shortcut={{ modifiers: ["ctrl"], key: "f" }}
        />
        <Action
          title={tab.pinned ? "Unpin Tab" : "Pin Tab"}
          icon={{ source: Icon.Pin, tintColor: Color.Purple }}
          shortcut={{ modifiers: ["ctrl"], key: "." }}
          onAction={() => togglePin(tab)}
        />
        <Action
          title="Refresh Tab"
          icon={{ source: Icon.ArrowClockwise, tintColor: Color.Purple }}
          shortcut={{ modifiers: ["ctrl"], key: "r" }}
          onAction={() => refreshTab(tab)}
        />
        <Action
          title="Discard Tab (Freeze)"
          icon={{ source: Icon.LivestreamDisabled, tintColor: Color.Purple }}
          shortcut={{ modifiers: ["ctrl"], key: "d" }}
          onAction={() => discard(tab)}
        />
        {tab.browserType === "edge" && (
          <Action
            title={tab.url?.startsWith("read:") ? "Exit Reader Mode" : "Enter Reader Mode"}
            icon={{ source: Icon.Calendar, tintColor: Color.Purple }}
            shortcut={{ modifiers: ["shift"], key: "r" }}
            onAction={() => {
              if (tab.url?.startsWith("read:")) {
                // Extract original URL from ?url= param (Edge's internal reader format)
                const urlParamIdx = tab.url.indexOf("?url=");
                if (urlParamIdx !== -1) {
                  try {
                    navigateTab(tab, decodeURIComponent(tab.url.slice(urlParamIdx + 5)));
                    return;
                  } catch {
                    /* fallback */
                  }
                }
                // Fallback: strip read: prefix
                navigateTab(tab, tab.url.replace(/^read:[/]*/, ""));
              } else {
                navigateTab(tab, `read:${tab.url}`);
              }
            }}
          />
        )}
        <Action.Push
          title="Rename Tab (Local Only)"
          icon={{ source: Icon.Pencil, tintColor: Color.Purple }}
          shortcut={{ modifiers: ["ctrl"], key: "e" }}
          target={<RenameTabForm tab={tab} onRename={(title) => rename(tab, title)} />}
        />
        <Action
          title="Duplicate Tab"
          icon={{ source: Icon.PlusSquare, tintColor: Color.Purple }}
          shortcut={{ modifiers: ["ctrl"], key: "l" }}
          onAction={() => {
            sendToSocket({ type: "DUPLICATE_TAB", tabId: tab.id });
            showToast(Toast.Style.Success, "Tab Duplicated", tab.displayTitle);
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Tab Groups">
        <Action.Push
          title="Create Group"
          icon={{ source: Icon.Plus, tintColor: Color.Orange }}
          shortcut={{ modifiers: ["ctrl"], key: "g" }}
          target={<CreateGroupForm tab={tab} allTabs={allTabs} onCreate={createGroup} />}
        />
        <ActionPanel.Submenu
          title="Move to Group"
          icon={{ source: Icon.Folder, tintColor: Color.Orange }}
          shortcut={{ modifiers: ["shift"], key: "z" }}
        >
          {tab.groupId !== -1 && (
            <Action
              title="Ungroup"
              icon={{ source: Icon.Multiply, tintColor: Color.Red }}
              onAction={() => ungroup(tab)}
            />
          )}
          {groups
            .filter((group) => group.id !== tab.groupId && group.browserType === tab.browserType)
            .map((group) => (
              <Action
                key={group.id}
                title={group.title || "Untitled Group"}
                icon={{
                  source: Icon.Circle,
                  tintColor: getTabGroupColor(group.color, tab.browserType),
                }}
                onAction={() => move(tab, group.id)}
              />
            ))}
        </ActionPanel.Submenu>
        <ActionPanel.Submenu
          title="Move to Window"
          icon={{ source: Icon.AppWindow, tintColor: Color.Orange }}
          shortcut={{ modifiers: ["shift"], key: "enter" }}
        >
          {Array.from(
            new Set(
              allTabs
                .filter(
                  (t) =>
                    t.browserType === tab.browserType &&
                    String(t.windowId) !== String(tab.windowId) &&
                    t.windowId &&
                    t.windowType !== "popup",
                )
                .map((t) => String(t.windowId)),
            ),
          ).map((windowId) => {
            const windowActiveTab =
              allTabs.find((t) => String(t.windowId) === windowId && t.isActive) ||
              allTabs.find((t) => String(t.windowId) === windowId);
            return (
              <Action
                key={windowId}
                title={
                  windowActiveTab?.workspaceName
                    ? windowActiveTab.workspaceName
                    : `${windowActiveTab?.title?.substring(0, 40) || "Unknown Window"}...`
                }
                icon={
                  windowActiveTab?.workspaceName
                    ? { source: Icon.Map, tintColor: Color.Purple }
                    : { source: Icon.Window, tintColor: Color.Blue }
                }
                onAction={() => {
                  sendToSocket({ type: "MOVE_TAB_TO_WINDOW", tabId: tab.id, windowId });
                  const toastTitle = windowActiveTab?.workspaceName
                    ? `Moved to ${windowActiveTab.workspaceName}`
                    : "Moved to Window";
                  showToast(Toast.Style.Success, toastTitle);
                }}
              />
            );
          })}
          <Action
            title="Move to New Window"
            icon={{ source: Icon.Plus, tintColor: Color.Green }}
            onAction={() => {
              sendToSocket({ type: "MOVE_TAB_TO_WINDOW", tabId: tab.id, windowId: "new" });
              showToast(Toast.Style.Success, "Moved to New Window");
            }}
          />
        </ActionPanel.Submenu>
        {ToggleCollapse && <ToggleCollapse />}
      </ActionPanel.Section>
      <ActionPanel.Section title="Collection">
        <BookmarkFolderPicker
          bookmarks={bookmarks}
          browserType={tab.browserType}
          actionTitle="Add to Bookmark Folder"
          icon={{ source: Icon.Bookmark, tintColor: Color.Yellow }}
          onSelect={(folderId) => createBookmark(tab, folderId)}
        />
        {HistoryAction && <HistoryAction />}
        {SessionsAction && <SessionsAction />}
        {BookmarksAction && <BookmarksAction />}
        {DownloadsAction && <DownloadsAction />}
        {WorkspacesAction && <WorkspacesAction />}
      </ActionPanel.Section>

      <ActionPanel.Section title="Switch Navigation">
        {CycleBrowserAction && <CycleBrowserAction />}
        {CycleWindowAction && <CycleWindowAction />}
        {currentSearchMode && setManualSearchMode && (
          <SearchModeAction
            currentSearchMode={currentSearchMode}
            setManualSearchMode={setManualSearchMode}
            searchText={searchText}
            setSearchText={setSearchText}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Utilities">
        <Action
          title="Copy URL"
          icon={{ source: Icon.CopyClipboard, tintColor: Color.SecondaryText }}
          shortcut={{ modifiers: ["shift"], key: "c" }}
          {...({ autoCloseWindow: false, closeMainWindow: false } as {
            autoCloseWindow: boolean;
            closeMainWindow: boolean;
          })}
          onAction={async () => {
            if (tab.url) {
              forceCopy(tab.url);
              showToast({ style: Toast.Style.Success, title: `Copied URL`, message: tab.url });
            }
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Danger Zone">
        <Action
          title="Minimize/Restore Window"
          icon={{ source: Icon.Window, tintColor: Color.Orange }}
          shortcut={{ modifiers: ["ctrl"], key: "m" }}
          onAction={() => {
            if (tab.windowId) {
              sendToSocket({ type: "TOGGLE_MINIMIZE_WINDOW", windowId: tab.windowId, browser: tab.browserType });
              showToast(Toast.Style.Success, "Window Minimized");
            }
          }}
        />
        <Action
          title="Close Window"
          icon={{ source: Icon.Window, tintColor: Color.Red }}
          style={Action.Style.Destructive}
          shortcut={getActionShortcut("closeWindow") || { modifiers: ["ctrl"], key: "x" }}
          onAction={() => {
            if (tab.windowId) closeWindow(tab.windowId, tab.browserType);
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
});

export const TabItem = React.memo((props: TabItemProps) => {
  const {
    tab,
    cycleBrowserAction,
    cycleWindowAction,
    toggleCollapse,
    historyAction,
    sessionsAction,
    bookmarksAction,
    downloadsAction,
    workspacesAction,
  } = props;

  const seekSeconds = 5;
  const hasMedia = tab.currentTime !== undefined;

  const accessories = useMemo(() => {
    const acc = [...(tab.cachedAccessories || [])];

    // 1. LIVE MEDIA ACCESSORY
    if (tab.currentTime !== undefined && tab.duration !== undefined && tab.duration > 0) {
      let displayValue = `${formatTime(tab.currentTime)} / ${formatTime(tab.duration)}`;
      if (typeof tab.playbackRate === "number" && Math.abs(tab.playbackRate - 1.0) > 0.01) {
        displayValue = `${displayValue} • ${tab.playbackRate}x`;
      }

      const timeAcc = {
        tag: { value: displayValue, color: tab.paused ? Color.SecondaryText : Color.Green },
        tooltip: tab.paused ? "Paused" : "Media Progress",
      };

      // Find the "Active Tab" dot index to insert before it
      const dotIndex = acc.findIndex((a) => {
        if (!a.icon) return false;
        if (typeof a.icon === "object" && "source" in a.icon) {
          return (a.icon as { source: unknown }).source === Icon.Dot;
        }
        return a.icon === Icon.Dot;
      });
      if (dotIndex !== -1) {
        acc.splice(dotIndex, 0, timeAcc);
      } else {
        acc.push(timeAcc);
      }
    }

    return acc;
  }, [tab.cachedAccessories, tab.currentTime, tab.duration, tab.paused, tab.playbackRate]);

  return (
    <List.Item
      title={tab.displayTitle}
      subtitle={tab.displaySubtitle}
      icon={useMemo(() => getTabIcon(tab), [tab.url, tab.favIconUrl, tab.title])}
      accessories={accessories}
      actions={
        <TabActionPanel
          {...props}
          hasMedia={hasMedia}
          seekSeconds={seekSeconds}
          ToggleCollapse={toggleCollapse}
          HistoryAction={historyAction}
          SessionsAction={sessionsAction}
          BookmarksAction={bookmarksAction}
          DownloadsAction={downloadsAction}
          CycleBrowserAction={cycleBrowserAction}
          CycleWindowAction={cycleWindowAction}
          WorkspacesAction={workspacesAction}
          currentSearchMode={props.currentSearchMode}
          setManualSearchMode={props.setManualSearchMode}
        />
      }
    />
  );
});
