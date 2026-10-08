import { List, ActionPanel, Action, Icon, closeMainWindow, showToast, Toast } from "@raycast/api";

import { useQutebrowserTabs } from "./hooks/useQutebrowserTabs";
import { TabListItem } from "./components/TabListItem";
import { Tab } from "./types";

export default function Command() {
  const {
    filteredTabs,
    isLoading,
    error,
    searchText,
    setSearchText,
    focusTab,
    openSearchInNewTab,
    openUrlInNewTab,
    refreshTabs,
  } = useQutebrowserTabs();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tabs by title or URL..."
      filtering={false}
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action
            title="Refresh Tabs"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => {
              refreshTabs();
              showToast({
                style: Toast.Style.Success,
                title: "Refreshed tab data",
              });
            }}
            icon={Icon.ArrowClockwise}
          />
        </ActionPanel>
      }
    >
      {error ? (
        <List.EmptyView title="Error" description={error} />
      ) : filteredTabs.length === 0 && searchText ? (
        <>
          <List.Section title="No Matching Tabs">
            <List.Item
              title={`Search for "${searchText}"`}
              subtitle="Search with default search engine"
              icon={Icon.MagnifyingGlass}
              actions={
                <ActionPanel>
                  <Action
                    title="Search with Qutebrowser"
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={async () => {
                      const success = await openSearchInNewTab(searchText);
                      if (success) await closeMainWindow();
                    }}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title={`Open "${searchText}"`}
              subtitle="Open directly as URL"
              icon={Icon.Globe}
              actions={
                <ActionPanel>
                  <Action
                    title="Open URL with Qutebrowser"
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={async () => {
                      const url = searchText.includes("://") ? searchText : `https://${searchText}`;
                      const success = await openUrlInNewTab(url);
                      if (success) await closeMainWindow();
                    }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      ) : filteredTabs.length === 0 ? (
        <List.EmptyView
          title="No Open Tabs"
          description="No tabs are currently open in qutebrowser."
          icon={Icon.XmarkCircle}
        />
      ) : (
        // Group tabs by window, with proper ordering
        (() => {
          // Group tabs by window
          const windowGroups = new Map<number, Tab[]>();

          // Create a group for each window
          filteredTabs.forEach((tab) => {
            if (!windowGroups.has(tab.window)) {
              windowGroups.set(tab.window, []);
            }
            windowGroups.get(tab.window)?.push(tab);
          });

          // Sort tabs within each window group
          windowGroups.forEach((tabs) => {
            tabs.sort((a, b) => {
              // First by active status (active tabs first within window)
              if (a.active && !b.active) return -1;
              if (!a.active && b.active) return 1;

              // Then by pinned status
              if (a.pinned && !b.pinned) return -1;
              if (!a.pinned && b.pinned) return 1;

              // Then by tab index
              return a.index - b.index;
            });
          });

          // Sort window groups by window index
          const sortedWindows = Array.from(windowGroups.entries()).sort(([windowA], [windowB]) => windowA - windowB);

          return (
            <>
              {sortedWindows.map(([windowIdx, tabs]) => (
                <List.Section key={windowIdx} title={`Window ${windowIdx + 1}`}>
                  {tabs.map((tab) => (
                    <TabListItem
                      key={`${tab.window}-${tab.index}`}
                      tab={tab}
                      onFocus={focusTab}
                      refreshTabs={refreshTabs}
                    />
                  ))}
                </List.Section>
              ))}
            </>
          );
        })()
      )}
    </List>
  );
}
