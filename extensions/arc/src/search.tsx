import { Icon, LaunchProps, List, getPreferenceValues } from "@raycast/api";
import { MutatePromise, useCachedPromise } from "@raycast/utils";
import { chain } from "lodash";
import { useState } from "react";
import { getTabs } from "./arc";
import { HistoryEntryListItem, SuggestionListItem, TabListItem } from "./list";
import { searchArcPreferences } from "./preferences";
import { useHistorySearch } from "./history";
import { useSuggestions } from "./suggestions";
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

function SearchArc(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const { data: history, isLoading: isLoadingHistory, permissionView } = useHistorySearch(searchText, 25);
  const { data: tabs, isLoading: isLoadingTabs, mutate: mutateTabs } = useCachedPromise(getTabs);
  const { data: suggestions, isLoading: isLoadingSuggestions } = useSuggestions(searchText);

  if (permissionView) {
    return permissionView;
  }

  return (
    <List
      searchBarPlaceholder="Search"
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
        tab.url.toLowerCase().includes(props.searchText.toLowerCase()),
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
  const { suggestions, searchText } = props;

  // Lets return early if we don't want to show suggestions
  if (!searchArcPreferences.showSuggestions) {
    return null;
  }

  const preferences = getPreferenceValues<Preferences.Search>();

  return (
    <List.Section title="Suggestions" subtitle={preferences.engine}>
      {suggestions?.map((suggestion) => (
        <SuggestionListItem key={suggestion.id} suggestion={suggestion} searchText={searchText} />
      ))}
    </List.Section>
  );
}

export default function Command(props: LaunchProps) {
  return (
    <VersionCheck>
      <SearchArc {...props} />
    </VersionCheck>
  );
}
