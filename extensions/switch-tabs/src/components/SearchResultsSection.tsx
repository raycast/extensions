import React from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  getPreferenceValues,
  closeMainWindow,
  Color,
  Toast,
  showToast,
} from "@raycast/api";
import { DisplayTab, BridgeMessage } from "../types";
import { SearchResult } from "../utils/searchTypes";
import { getActionShortcut, forceCopy } from "../helpers";

import { SearchModeAction } from "./SearchModeToggle";

interface SearchResultsSectionProps {
  searchResults: SearchResult[];
  activateTab: (tab: DisplayTab) => void;
  activateTabBackground: (tab: DisplayTab) => void;
  closeTab: (tab: DisplayTab) => void;
  closeWindow: (windowId: string, browser?: string) => void;
  togglePin: (tab: DisplayTab) => void;
  toggleFocusMode: (tab: DisplayTab) => void;
  toggleFullscreen: (tab: DisplayTab) => void;
  renameTab: (tab: DisplayTab, title: string) => void;
  navigateCurrentTab: (url: string, tabs: DisplayTab[]) => void;
  allDisplayTabs: DisplayTab[];
  browserTarget: string;
  windowTarget?: string;
  sendToSocket: (msg: BridgeMessage) => void;
  setSearchText: (text: string) => void;
  BookmarksAction: () => React.ReactElement;
  HistoryAction: () => React.ReactElement;
  SessionsAction: () => React.ReactElement;
  DownloadsAction: () => React.ReactElement;
  WorkspacesAction: () => React.ReactElement;
  CycleBrowserAction: () => React.ReactElement | null;
  CycleWindowAction: () => React.ReactElement | null;
  changePlaybackRate: (tab: DisplayTab, direction: "up" | "down") => void;
  currentSearchMode?: "filter" | "search";
  setManualSearchMode?: (mode: "filter" | "search") => void;
}

// V-CORE: Isolated Action Panel for Web Results.
// Moving this out of the main map loop ensures that the 'Action Panel' is extremely stable
// and ready to fire the second the item appears, without re-calculating the tree on every key.
interface WebSearchActionPanelProps {
  item: SearchResult;
  browserTarget: string;
  windowTarget?: string;
  allDisplayTabs: DisplayTab[];
  navigateCurrentTab: (url: string, tabs: DisplayTab[]) => void;
  sendToSocket: (msg: BridgeMessage) => void;
  setSearchText: (text: string) => void;
  CycleBrowserAction?: () => React.ReactElement | null;
  CycleWindowAction?: () => React.ReactElement | null;
  currentSearchMode?: "filter" | "search";
  setManualSearchMode?: (mode: "filter" | "search") => void;
}

const WebSearchActionPanel = React.memo((props: WebSearchActionPanelProps) => {
  const {
    item,
    browserTarget,
    windowTarget,
    allDisplayTabs,
    navigateCurrentTab,
    sendToSocket,
    setSearchText,
    CycleBrowserAction,
    CycleWindowAction,
    currentSearchMode,
    setManualSearchMode,
  } = props;

  return (
    <ActionPanel>
      <Action
        title="Open in New Tab"
        icon={{ source: Icon.Globe, tintColor: Color.Blue }}
        shortcut={getActionShortcut("searchNew")}
        onAction={async () => {
          const preferences = getPreferenceValues();
          const inBackground = preferences.openInBackground;
          if (inBackground) {
            sendToSocket({
              type: "CREATE_TAB_BACKGROUND",
              url: item.url,
              browser: browserTarget,
              windowId: windowTarget,
            });
            if (preferences.clearSearchOnEnter) {
              setSearchText("");
            }
          } else {
            if (preferences.clearSearchOnEnter) {
              setSearchText("");
            }
            await closeMainWindow({ clearRootSearch: true });
            sendToSocket({
              type: "CREATE_TAB",
              url: item.url,
              browser: browserTarget,
              windowId: windowTarget,
            });
          }
        }}
      />
      <Action
        title="Open in Current Tab"
        icon={{ source: Icon.Window, tintColor: Color.Blue }}
        shortcut={getActionShortcut("searchCurrent")}
        onAction={async () => {
          const preferences = getPreferenceValues();
          if (preferences.clearSearchOnCurrentTab) {
            setSearchText("");
          }
          await closeMainWindow({ clearRootSearch: true });
          navigateCurrentTab(item.url, allDisplayTabs);
        }}
      />
      <Action
        title="Open in Focus Popup"
        icon={{ source: Icon.Desktop, tintColor: Color.Blue }}
        shortcut={{ modifiers: ["ctrl"], key: "o" }}
        onAction={() => {
          sendToSocket({
            type: "CREATE_TAB",
            url: item.url,
            browser: browserTarget,
            asPopup: true,
          });
          showToast({
            style: Toast.Style.Success,
            title: "Opened in Popup",
            message: item.query || item.url,
          });
        }}
      />
      <Action
        title="Open in Background"
        icon={{ source: Icon.AppWindowList, tintColor: Color.Blue }}
        shortcut={{ modifiers: ["shift"], key: "enter" }}
        onAction={() => {
          sendToSocket({
            type: "CREATE_TAB_BACKGROUND",
            url: item.url,
            browser: browserTarget,
            windowId: windowTarget,
          });
          const preferences = getPreferenceValues();
          if (preferences.clearSearchOnBackground) {
            setSearchText("");
          }
          showToast({
            style: Toast.Style.Success,
            title: "Opened in background",
            message: item.query,
          });
        }}
      />
      <ActionPanel.Section title="Quick Search">
        <Action
          title="Set Search Query"
          icon={{ source: Icon.Pencil, tintColor: Color.Purple }}
          shortcut={{ modifiers: ["shift"], key: "s" }}
          onAction={() => setSearchText(item.query)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Switch Navigation">
        {CycleBrowserAction && <CycleBrowserAction />}
        {CycleWindowAction && <CycleWindowAction />}
        {currentSearchMode && setManualSearchMode && (
          <SearchModeAction
            currentSearchMode={currentSearchMode}
            setManualSearchMode={setManualSearchMode}
            searchText={item.query}
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
            if (item.url) {
              forceCopy(item.url);
              showToast({
                style: Toast.Style.Success,
                title: `Copied URL`,
                message: item.url,
              });
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
});

export function SearchResultsSection({
  searchResults,
  navigateCurrentTab,
  allDisplayTabs,
  browserTarget,
  windowTarget,
  sendToSocket,
  setSearchText,
  CycleBrowserAction,
  CycleWindowAction,
  currentSearchMode,
  setManualSearchMode,
}: SearchResultsSectionProps) {
  return (
    <List.Section title="Search Results" subtitle={searchResults.length + ""}>
      {searchResults.map((item: SearchResult) => {
        const mainIcon = item.icon || Icon.MagnifyingGlass;

        return (
          <List.Item
            key={item.id}
            title={item.query}
            subtitle={item.description}
            icon={mainIcon}
            accessories={[]}
            actions={
              <WebSearchActionPanel
                item={item}
                browserTarget={browserTarget}
                windowTarget={windowTarget}
                allDisplayTabs={allDisplayTabs}
                navigateCurrentTab={navigateCurrentTab}
                sendToSocket={sendToSocket}
                setSearchText={setSearchText}
                CycleBrowserAction={CycleBrowserAction}
                CycleWindowAction={CycleWindowAction}
                currentSearchMode={currentSearchMode}
                setManualSearchMode={setManualSearchMode}
              />
            }
          />
        );
      })}
    </List.Section>
  );
}
