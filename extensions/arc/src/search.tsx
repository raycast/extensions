import { Icon, List } from "@raycast/api";
import { useCachedPromise, useSQL } from "@raycast/utils";
import { useState } from "react";
import { historyDatabasePath, getHistoryQuery } from "./sql";
import { HistoryEntry } from "./types";
import { getKey, getLocationTitle, getNumberOfHistoryEntries, getNumberOfTabs, getOrderedLocations } from "./utils";
import { VersionCheck } from "./version";
import { chain } from "lodash";
import { getTabs } from "./arc";
import { useSuggestions } from "./suggestions";
import { HistoryEntryListItem, SuggestionListItem, TabListItem } from "./list";

function SearchArc() {
  const [searchText, setSearchText] = useState("");
  const {
    data: history,
    isLoading: isLoadingHistory,
    permissionView,
  } = useSQL<HistoryEntry>(historyDatabasePath, getHistoryQuery(searchText, 25));
  const { data: tabs, isLoading: isLoadingTabs, mutate: mutateTabs } = useCachedPromise(getTabs);
  const { data: suggestions, isLoading: isLoadingSuggestions } = useSuggestions(searchText);

  if (permissionView) {
    return permissionView;
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
      isLoading={isLoadingTabs || isLoadingHistory || isLoadingSuggestions}
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found ¯\_(ツ)_/¯" />

      {orderedLocations.map((location) => {
        const tabs = groupedTabs[location];
        return (
          <List.Section key={location} title={getLocationTitle(location)} subtitle={getNumberOfTabs(tabs)}>
            {tabs?.map((tab) => (
              <TabListItem key={getKey(tab)} tab={tab} searchText={searchText} mutate={mutateTabs} />
            ))}
          </List.Section>
        );
      })}

      <List.Section title="History" subtitle={getNumberOfHistoryEntries(history)}>
        {history?.map((entry) => (
          <HistoryEntryListItem key={entry.id} searchText={searchText} entry={entry} />
        ))}
      </List.Section>

      <List.Section title="Suggestions">
        {suggestions?.map((suggestion) => (
          <SuggestionListItem key={suggestion.id} suggestion={suggestion} searchText={searchText} />
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
