import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { AliasListItem } from "./components/AliasListItem";
import { useAliasesWithFrecency, useAllItems, useAutoTriggerAlias } from "./hooks";
import { filterAliases } from "./lib/aliasFiltering";
import type { ExpandAliasPreferences } from "./schemas";

export default function Command() {
  const preferences = getPreferenceValues<ExpandAliasPreferences>();
  const { data: aliases = {}, isLoading, revalidate } = useAllItems();
  const [searchText, setSearchText] = useState("");

  const filterResult = useMemo(
    () =>
      filterAliases(aliases, {
        searchText,
        snippetPrefix: preferences.snippetPrefix,
      }),
    [aliases, searchText, preferences.snippetPrefix],
  );

  const { sortedEntries, visitItem } = useAliasesWithFrecency(filterResult.entries);

  useAutoTriggerAlias(sortedEntries, searchText, setSearchText, visitItem, preferences);

  const totalAliases = Object.keys(aliases).length;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Expand Alias or Insert Snippet... (${totalAliases} ${totalAliases === 1 ? "alias" : "aliases"})`}
      onSearchTextChange={setSearchText}
      searchText={searchText}
    >
      {sortedEntries.length === 0 ? (
        <List.EmptyView
          icon={searchText ? Icon.MagnifyingGlass : Icon.ExclamationMark}
          title={searchText ? "No Results Found" : "No Aliases Found"}
          description={
            searchText
              ? `No aliases found matching "${searchText}"`
              : "Make sure you have set the Leader Key config path in preferences"
          }
        />
      ) : (
        sortedEntries.map(([alias, aliasItem]) => {
          return (
            <AliasListItem
              key={alias}
              alias={alias}
              item={aliasItem}
              preferences={preferences}
              searchText={searchText}
              onSelect={() => visitItem([alias, aliasItem])}
              onOpen={() => visitItem([alias, aliasItem])}
              onDelete={() => revalidate()}
              allFilteredItems={sortedEntries}
            />
          );
        })
      )}
    </List>
  );
}
