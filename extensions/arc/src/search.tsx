import { Icon, LaunchProps, List } from "@raycast/api";
import { MutatePromise, useCachedPromise, useSQL } from "@raycast/utils";
import { useState } from "react";
import { historyDatabasePath, getHistoryQuery } from "./sql";
import { HistoryEntry, Suggestion, Tab } from "./types";
import {
  getKey,
  getLocationTitle,
  getNumberOfHistoryEntries,
  getNumberOfTabs,
  getOrderedLocations,
  isLocationShown,
} from "./utils";
import { VersionCheck } from "./version";
import { chain } from "lodash";
import { getTabs } from "./arc";
import { useSuggestions } from "./suggestions";
import { HistoryEntryListItem, SuggestionListItem, TabListItem } from "./list";
import { searchArcPreferences } from "./preferences";

function SearchArc(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
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

  return (
    <List
      searchBarPlaceholder="Search history"
      isLoading={isLoadingTabs || isLoadingHistory || isLoadingSuggestions}
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found ¯\_(ツ)_/¯" />

      {searchArcPreferences.sorting === "tabsHistorySuggestions" ? (
        <>
          <TabListSections searchText={searchText} tabs={tabs} mutateTabs={mutateTabs} />
          <HistoryListSection searchText={searchText} history={history} />
          <SuggestionsListSection searchText={searchText} suggestions={suggestions} />
        </>
      ) : (
        <>
          <HistoryListSection searchText={searchText} history={history} />
          {!isLoadingHistory && <TabListSections searchText={searchText} tabs={tabs} mutateTabs={mutateTabs} />}
          <SuggestionsListSection searchText={searchText} suggestions={suggestions} />
        </>
      )}
    </List>
  );
}

function TabListSections(props: { tabs?: Tab[]; mutateTabs: MutatePromise<Tab[] | undefined>; searchText: string }) {
  const orderedLocations = getOrderedLocations();
  const groupedTabs = chain(props.tabs)
    .filter(
      (tab) =>
        tab.title.toLowerCase().includes(props.searchText.toLowerCase()) ||
        tab.url.toLowerCase().includes(props.searchText.toLowerCase())
    )
    .groupBy((tab) => tab.location)
    .value();

  return (
    <>
      {orderedLocations
        .filter((location) => isLocationShown(location))
        .map((location) => {
          const tabs = groupedTabs[location];
          return (
            <List.Section key={location} title={getLocationTitle(location)} subtitle={getNumberOfTabs(tabs)}>
              {tabs?.map((tab) => (
                <TabListItem key={getKey(tab)} tab={tab} searchText={props.searchText} mutate={props.mutateTabs} />
              ))}
            </List.Section>
          );
        })}
    </>
  );
}

function HistoryListSection(props: { history?: HistoryEntry[]; searchText: string }) {
  return searchArcPreferences.showHistory ? (
    <List.Section title="History" subtitle={getNumberOfHistoryEntries(props.history)}>
      {props.history?.map((entry) => (
        <HistoryEntryListItem key={entry.id} searchText={props.searchText} entry={entry} />
      ))}
    </List.Section>
  ) : null;
}

function SuggestionsListSection(props: { suggestions?: Suggestion[]; searchText: string }) {
  return searchArcPreferences.showSuggestions ? (
    <List.Section title="Suggestions">
      {props.suggestions?.map((suggestion) => (
        <SuggestionListItem key={suggestion.id} suggestion={suggestion} searchText={props.searchText} />
      ))}
    </List.Section>
  ) : null;
}

export default function Command(props: LaunchProps) {
  return (
    <VersionCheck>
      <SearchArc {...props} />
    </VersionCheck>
  );
}
