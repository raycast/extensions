// ─── TAB SWITCH CONTENT (RENDERING SHIELD) ────────────────────────────────────
// Renders the tab list in filter mode only.
// Search mode is handled upstream in TabSwitchList — this component never runs while searching.

import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  getPreferenceValues,
  open,
} from "@raycast/api";
import { useMemo } from "react";
import React from "react";
import { CollapsedTabsSection } from "./CollapsedTabsSection";
import { NormalTabsSections } from "./NormalTabsSections";
import { TabSwitchContentProps } from "./TabSwitchList";

function limitSections<T>(
  sections: Record<string, T[]>,
  limit: number,
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  let count = 0;
  for (const [title, tabs] of Object.entries(sections)) {
    const remaining = limit - count;
    if (remaining <= 0) break;
    if (tabs.length <= remaining) {
      result[title] = tabs;
      count += tabs.length;
    } else {
      result[title] = tabs.slice(0, remaining);
      count += remaining;
      break;
    }
  }
  return result;
}

export const TabSwitchContent = React.memo((props: TabSwitchContentProps) => {
  const {
    allDisplayTabs,
    globalSessions,
    viewReturnTick,
    isCollapsed,
    collapsedViewItems,
    browserIconMap,
    groupsArray,
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
    navigateTab,
    createBookmark,
    closeWindow,
    renameTab,
    changePlaybackRate,
    ToggleAction,
    HistoryActionComponent,
    SessionsActionComponent,
    BookmarksActionComponent,
    DownloadsActionComponent,
    WorkspacesActionComponent,
    CycleBrowserActionComponent,
    CycleWindowActionComponent,
    normalSections,
    unfilteredMergedTabs,
    sendToSocket,
    searchText,
    setSearchText,
    isReturnPaint,
    currentSearchMode,
    setManualSearchMode,
  } = props;

  const isLimitedView = isReturnPaint;
  const hasSearchText = searchText.trim().length > 0;

  const clearKey = useMemo(() => {
    const prefs = getPreferenceValues();
    return (prefs.clearSearchKey as string) || "'";
  }, []);

  if (
    allDisplayTabs.length === 0 &&
    (!globalSessions || globalSessions.length === 0)
  ) {
    return (
      <List.EmptyView
        title={hasSearchText ? "No Matching Tabs" : "No Tabs Found"}
        description={
          hasSearchText
            ? `No tabs match your filter. Press ${clearKey} to clear the filter.`
            : "Your browser is out of reach of the server."
        }
        icon={hasSearchText ? Icon.MagnifyingGlass : Icon.EyeDisabled}
        actions={
          <ActionPanel>
            <Action
              title="Open Browser"
              icon={{ source: Icon.Globe, tintColor: Color.Blue }}
              onAction={() => open("https://")}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <React.Fragment key={viewReturnTick}>
      {isCollapsed ? (
        <CollapsedTabsSection
          collapsedViewItems={
            isLimitedView ? collapsedViewItems.slice(0, 10) : collapsedViewItems
          }
          browserIconMap={browserIconMap}
          groups={isLimitedView ? groupsArray.slice(0, 3) : groupsArray}
          bookmarks={bookmarks || []}
          activateTab={activateTab}
          activateTabBackground={activateTabBackground}
          closeTab={closeTab}
          moveTabToGroup={moveTabToGroup}
          ungroupTab={ungroupTab}
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
          updateTabGroup={updateTabGroup}
          ToggleAction={ToggleAction}
          HistoryAction={HistoryActionComponent}
          SessionsAction={SessionsActionComponent}
          BookmarksAction={BookmarksActionComponent}
          DownloadsAction={DownloadsActionComponent}
          WorkspacesAction={WorkspacesActionComponent}
          CycleBrowserAction={CycleBrowserActionComponent}
          CycleWindowAction={CycleWindowActionComponent}
          allTabs={unfilteredMergedTabs}
          sendToSocket={sendToSocket}
          currentSearchMode={currentSearchMode}
          setManualSearchMode={setManualSearchMode}
          searchText={searchText}
          setSearchText={setSearchText}
        />
      ) : (
        <NormalTabsSections
          sections={
            isLimitedView ? limitSections(normalSections, 15) : normalSections
          }
          groups={isLimitedView ? groupsArray.slice(0, 3) : groupsArray}
          bookmarks={bookmarks || []}
          activateTab={activateTab}
          activateTabBackground={activateTabBackground}
          closeTab={closeTab}
          moveTabToGroup={moveTabToGroup}
          ungroupTab={ungroupTab}
          createTabGroup={createTabGroup}
          updateTabGroup={updateTabGroup}
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
          HistoryAction={HistoryActionComponent}
          SessionsAction={SessionsActionComponent}
          BookmarksAction={BookmarksActionComponent}
          DownloadsAction={DownloadsActionComponent}
          WorkspacesAction={WorkspacesActionComponent}
          CycleBrowserAction={CycleBrowserActionComponent}
          CycleWindowAction={CycleWindowActionComponent}
          allTabs={unfilteredMergedTabs}
          sessions={globalSessions}
          sendToSocket={sendToSocket}
          currentSearchMode={currentSearchMode}
          setManualSearchMode={setManualSearchMode}
          searchText={searchText}
          setSearchText={setSearchText}
        />
      )}
    </React.Fragment>
  );
});
