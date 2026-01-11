import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { AliasListItem } from "./components/AliasListItem";
import { useAliasesWithFrecency, useAllItems, useAutoTriggerAlias } from "./hooks";
import type { ExpandAliasPreferences } from "./schemas";

export default function Command() {
  const preferences = getPreferenceValues<ExpandAliasPreferences>();
  const { data: aliases = {}, isLoading, revalidate } = useAllItems();
  const [searchText, setSearchText] = useState("");

  const filteredEntries = useMemo(() => {
    const entries = Object.entries(aliases);
    if (!searchText.trim()) return entries;
    return entries.filter(([alias]) => alias.toLowerCase().includes(searchText.toLowerCase()));
  }, [aliases, searchText]);

  const { sortedEntries, visitItem } = useAliasesWithFrecency(filteredEntries);

  useAutoTriggerAlias(sortedEntries, searchText, setSearchText, visitItem, preferences, { forceSnippetMode: true });

  const totalAliases = Object.keys(aliases).length;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Insert Snippet... (${totalAliases} ${totalAliases === 1 ? "snippet" : "snippets"})`}
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
              primaryActionType="paste"
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
