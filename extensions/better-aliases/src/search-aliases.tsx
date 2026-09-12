import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { AliasListItem } from "./components/AliasListItem";
import { type FilterType, useAliasesWithFrecency, useFilteredItems } from "./hooks";
import { fuzzySearchAliases } from "./lib/fuzzySearch";
import type { Preferences } from "./schemas";

export default function Command() {
  const { data, isLoading, revalidate } = useFilteredItems();
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const preferences = getPreferenceValues<Preferences>();

  const filteredData = useMemo(() => {
    if (!data) return {};
    switch (filter) {
      case "snippets":
        return data.snippets;
      case "aliases":
        return data.betterAliases;
      case "leader-key":
        return data.leaderKey;
      default:
        return { ...data.leaderKey, ...data.betterAliases, ...data.snippets };
    }
  }, [data, filter]);

  const searchResults = useMemo(() => fuzzySearchAliases(filteredData, searchText), [filteredData, searchText]);

  const { sortedEntries, visitItem } = useAliasesWithFrecency(searchResults);

  const totalItems = Object.keys(filteredData).length;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search... (${totalItems} total)`}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={(v) => setFilter(v as FilterType)}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Better Aliases Only" value="aliases" />
          <List.Dropdown.Item title="Leader Key Only" value="leader-key" />
          <List.Dropdown.Item title="Snippets Only" value="snippets" />
        </List.Dropdown>
      }
    >
      {sortedEntries.length === 0 ? (
        <List.EmptyView
          icon={searchText ? Icon.MagnifyingGlass : Icon.ExclamationMark}
          title={searchText ? "No Results Found" : "No Items Found"}
        />
      ) : (
        sortedEntries.map(([alias, item]) => (
          <AliasListItem
            key={alias}
            alias={alias}
            item={item}
            preferences={{ ...preferences, showFullAlias: false }}
            searchText={searchText}
            onSelect={() => visitItem([alias, item])}
            onDelete={() => revalidate()}
          />
        ))
      )}
    </List>
  );
}
