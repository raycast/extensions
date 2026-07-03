import { List, ActionPanel, Icon } from "@raycast/api";
import { getFavicon, usePromise } from "@raycast/utils";
import { useState, useRef } from "react";
import { getBrowserTabs } from "./utils/browser";
import {
  SwitchToTabAction,
  OpenNewTabAction,
  CloseTabAction,
  OpenInNewTabAction,
  CopyUrlAction,
  CopyTitleAction,
  CreateQuicklinkAction,
  DeduplicateTabsAction,
  ReloadAction,
} from "./utils/actions";
import { filterSearchable } from "./utils/search";
import { filterPendingCloseTabs, releaseConfirmedPendingCloseIds } from "./utils/pending-close";

export default function SearchTabs() {
  const [searchText, setSearchText] = useState("");
  const { data: tabs, isLoading, mutate, revalidate } = usePromise(getBrowserTabs);
  const pendingCloseIdsRef = useRef(new Set<string>());

  if (tabs) releaseConfirmedPendingCloseIds(pendingCloseIdsRef.current, tabs);

  // Keep tabs hidden while Helium is still reporting stale state after close.
  const tabsWithoutPendingClose = tabs ? filterPendingCloseTabs(tabs, pendingCloseIdsRef.current) : [];

  // Then filter by search text
  const filteredTabs = tabsWithoutPendingClose ? filterSearchable(tabsWithoutPendingClose, searchText) : [];

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
          id={tab.id}
          key={tab.id}
          title={tab.title || "Untitled"}
          subtitle={tab.url}
          keywords={[tab.url, tab.title || ""]}
          icon={tab.favicon || getFavicon(tab.url, { fallback: Icon.Globe })}
          actions={
            <ActionPanel>
              <SwitchToTabAction tab={tab} />
              <OpenNewTabAction />
              <CloseTabAction
                tab={tab}
                mutate={mutate}
                revalidate={revalidate}
                pendingCloseIdsRef={pendingCloseIdsRef}
              />
              <OpenInNewTabAction tab={tab} />
              <CopyUrlAction tab={tab} />
              <CopyTitleAction tab={tab} />
              <CreateQuicklinkAction url={tab.url} name={tab.title || "Untitled"} />
              <ReloadAction subject="Tabs" revalidate={revalidate} />
              <DeduplicateTabsAction
                tabs={tabsWithoutPendingClose}
                mutate={mutate}
                revalidate={revalidate}
                pendingCloseIdsRef={pendingCloseIdsRef}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
