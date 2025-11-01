import { List, ActionPanel, Icon, Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useRef } from "react";
import { getBrowserTabs, isBrowserExtensionAvailable } from "./utils/browser";
import {
  SwitchToTabAction,
  OpenNewTabAction,
  CloseTabAction,
  OpenInNewTabAction,
  CopyUrlAction,
  CopyTitleAction,
  CreateQuicklinkAction,
} from "./utils/actions";
import { filterSearchable } from "./utils/search";

export default function SearchTabs() {
  const [searchText, setSearchText] = useState("");
  const { data: tabs, isLoading, mutate } = usePromise(getBrowserTabs);
  const deletedTabIdsRef = useRef(new Set<number>());

  // Check if Browser Extension is available
  if (!isBrowserExtensionAvailable()) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Browser Extension Required"
          description="Please install the Raycast Browser Extension to use this command"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Install Browser Extension" url="https://www.raycast.com/browser-extension" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Filter out deleted tabs first (tabs that are being closed but might still appear in fetched data)
  const tabsWithoutDeleted = tabs ? tabs.filter((t) => !deletedTabIdsRef.current.has(t.id)) : [];

  // Then filter by search text
  const filteredTabs = tabsWithoutDeleted ? filterSearchable(tabsWithoutDeleted, searchText) : [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tabs by title or URL..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {filteredTabs.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Window}
          title="No Tabs Found"
          description="Make sure your browser is running with open tabs"
        />
      )}
      {filteredTabs.map((tab) => (
        <List.Item
          key={tab.id}
          title={tab.title || "Untitled"}
          subtitle={tab.url}
          keywords={[tab.url, tab.title || ""]}
          icon={tab.favicon || Icon.Globe}
          actions={
            <ActionPanel>
              <SwitchToTabAction tab={tab} />
              <OpenNewTabAction />
              <CloseTabAction tab={tab} mutate={mutate} deletedTabIdsRef={deletedTabIdsRef} />
              <OpenInNewTabAction tab={tab} />
              <CopyUrlAction tab={tab} />
              <CopyTitleAction tab={tab} />
              <CreateQuicklinkAction url={tab.url} name={tab.title || "Untitled"} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
