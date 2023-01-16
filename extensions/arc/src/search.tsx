import { ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { CopyLinkActionSection, EditTabActionSection, OpenLinkActionSections } from "./actions";
import { databasePath, getQuery, useSQL } from "./sql";
import { HistoryEntry } from "./types";
import { getDomain, getKey, getLastVisitedAt, getLocationTitle, getNumberOfTabs, getOrderedLocations } from "./utils";
import { isPermissionError, PermissionErrorView } from "./permissions";
import { VersionCheck } from "./version";
import { chain } from "lodash";
import { getTabs } from "./arc";

function SearchArc() {
  const [searchText, setSearchText] = useState("");
  const {
    data: history,
    isLoading: isLoadingHistory,
    error: historyError,
  } = useSQL<HistoryEntry>(databasePath, getQuery(searchText));
  const { data: tabs, isLoading: isLoadingTabs, mutate: mutateTabs } = useCachedPromise(getTabs);

  if (historyError) {
    if (isPermissionError(historyError)) {
      return <PermissionErrorView />;
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed searching history",
        message: historyError instanceof Error ? historyError.message : undefined,
      });
    }
  }

  const orderedLocations = getOrderedLocations();
  const groupedTabs = chain(tabs)
    .filter(
      (tab) =>
        tab.title.toLowerCase().includes(searchText.toLowerCase()) ||
        tab.url.toLowerCase().includes(searchText.toLowerCase())
    )
    .groupBy((tab) => tab.location)
    .value();

  return (
    <List
      searchBarPlaceholder="Search history"
      isLoading={isLoadingHistory || isLoadingTabs}
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found ¯\_(ツ)_/¯" />

      {orderedLocations.map((location) => {
        const tabs = groupedTabs[location];
        return (
          <List.Section key={location} title={getLocationTitle(location)} subtitle={getNumberOfTabs(tabs)}>
            {tabs?.map((tab) => (
              <List.Item
                key={getKey(tab)}
                icon={getFavicon(tab.url)}
                title={tab.title}
                subtitle={{
                  value: getDomain(tab.url),
                  tooltip: tab.url,
                }}
                actions={
                  <ActionPanel>
                    <OpenLinkActionSections url={tab.url} />
                    <CopyLinkActionSection url={tab.url} title={tab.title} />
                    <EditTabActionSection tab={tab} mutate={mutateTabs} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}

      <List.Section title="Visited Links">
        {history?.map((entry) => (
          <List.Item
            key={entry.id}
            icon={getFavicon(entry.url)}
            title={entry.title}
            subtitle={{
              value: getDomain(entry.url),
              tooltip: entry.url,
            }}
            accessories={[getLastVisitedAt(entry)]}
            actions={
              <ActionPanel>
                <OpenLinkActionSections url={entry.url} />
                <CopyLinkActionSection url={entry.url} title={entry.title} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default function Command() {
  return (
    <VersionCheck>
      <SearchArc />
    </VersionCheck>
  );
}
