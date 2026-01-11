import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { AliasListItem } from "./components/AliasListItem";
import { useAliasesWithFrecency, useSnippetsOnly } from "./hooks";
import { fuzzySearchAliases } from "./lib/fuzzySearch";
import type { Preferences } from "./schemas";

export default function Command() {
  const { data: snippets = {}, isLoading } = useSnippetsOnly();
  const [searchText, setSearchText] = useState("");
  const preferences = getPreferenceValues<Preferences>();

  const searchResults = useMemo(() => fuzzySearchAliases(snippets, searchText), [snippets, searchText]);

  const { sortedEntries, visitItem } = useAliasesWithFrecency(searchResults);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Insert snippet..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
    >
      {sortedEntries.length === 0 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No Results Found" />
      ) : (
        sortedEntries.map(([alias, snippetItem]) => (
          <AliasListItem
            key={alias}
            alias={alias}
            item={snippetItem}
            preferences={{ ...preferences, showFullAlias: false }}
            searchText={searchText}
            onSelect={() => visitItem([alias, snippetItem])}
            onOpen={() => visitItem([alias, snippetItem])}
          />
        ))
      )}
    </List>
  );
}
