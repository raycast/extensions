import { Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { databasePath, getQuery, useSQL } from "./sql";
import { HistoryEntry } from "./types";
import { getKey, getLocationTitle, getNumberOfHistoryEntries, getNumberOfTabs, getOrderedLocations } from "./utils";
import { isPermissionError, PermissionErrorView } from "./permissions";
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
    error: historyError,
  } = useSQL<HistoryEntry>(databasePath, getQuery(searchText, 25));
  const { data: tabs, isLoading: isLoadingTabs, mutate: mutateTabs } = useCachedPromise(getTabs);
  const { data: suggestions, isLoading: isLoadingSuggestions } = useSuggestions(searchText);

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
      isLoading={isLoadingTabs || isLoadingHistory || isLoadingSuggestions}
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found ¯\_(ツ)_/¯" />

      {orderedLocations.map((location) => {
        const tabs = groupedTabs[location];
        return (
          <List.Section key={location} title={getLocationTitle(location)} subtitle={getNumberOfTabs(tabs)}>
            {tabs?.map((tab) => (
              <TabListItem key={getKey(tab)} tab={tab} mutate={mutateTabs} />
            ))}
          </List.Section>
        );
      })}

      <List.Section title="History" subtitle={getNumberOfHistoryEntries(history)}>
        {history?.map((entry) => (
          <HistoryEntryListItem key={entry.id} entry={entry} />
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
