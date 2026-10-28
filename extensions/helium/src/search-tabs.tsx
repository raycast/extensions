import { List, Action, ActionPanel, Icon } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useEffect, useState, useRef } from "react";
import { useCachedBrowserTabs } from "./utils/use-cached-browser-tabs";
import {
  SwitchToTabAction,
  OpenNewTabAction,
  CloseTabAction,
  OpenInNewTabAction,
  CopyUrlAction,
  CopyTitleAction,
  CreateQuicklinkAction,
  DeduplicateTabsAction,
  OpenInHeliumAction,
  ReloadAction,
} from "./utils/actions";
import { filterSearchable } from "./utils/search";
import { filterPendingCloseTabs, releaseConfirmedPendingCloseIds, sharedPendingCloseIds } from "./utils/pending-close";
import { isTabCloseAvailable } from "./utils/browser-control";

const BROWSER_EXTENSION_URL = "https://www.raycast.com/browser-extension";

export default function SearchTabs() {
  const [searchText, setSearchText] = useState("");
  const { data: tabs, freshTabs, isLoading, mutate, revalidate } = useCachedBrowserTabs();
  const pendingCloseIdsRef = useRef(sharedPendingCloseIds);

  useEffect(() => {
    if (freshTabs) releaseConfirmedPendingCloseIds(pendingCloseIdsRef.current, freshTabs);
  }, [freshTabs]);

  // Keep tabs hidden while Helium is still reporting stale state after close.
  const tabsWithoutPendingClose = filterPendingCloseTabs(tabs, pendingCloseIdsRef.current);

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
          description={
            isTabCloseAvailable
              ? "Make sure your browser is running with open tabs"
              : "On Windows, tabs come from Raycast's browser extension — install it in Helium and make sure Helium is running. It reports tabs from every browser it is installed in, so tabs from other browsers can appear here too."
          }
          actions={
            isTabCloseAvailable ? undefined : (
              <ActionPanel>
                {/* Opened in Helium specifically — installing it in another browser would not help. */}
                <OpenInHeliumAction
                  title="Get Raycast Browser Extension"
                  icon={Icon.Download}
                  url={BROWSER_EXTENSION_URL}
                />
                <Action.CopyToClipboard title="Copy Link" content={BROWSER_EXTENSION_URL} />
              </ActionPanel>
            )
          }
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
