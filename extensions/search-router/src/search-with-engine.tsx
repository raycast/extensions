import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import type { SearchEngine } from "./types";
import { executeSearch } from "./execute-search";

type SearchWithEngineProps = {
  searchEngine: SearchEngine;
};

export default function SearchWithEngine({ searchEngine }: SearchWithEngineProps) {
  const [searchText, setSearchText] = useState("");

  const handleSearch = async () => {
    await executeSearch(searchEngine, searchText);
  };

  const action = (
    <ActionPanel>
      <Action title={`Search with ${searchEngine.s}`} icon={Icon.MagnifyingGlass} onAction={handleSearch} />
    </ActionPanel>
  );

  return (
    <List
      navigationTitle={`Search with ${searchEngine.s}`}
      searchBarPlaceholder={`Search ${searchEngine.s}…`}
      onSearchTextChange={setSearchText}
      filtering={false}
      actions={action}
    >
      <List.Item
        icon={Icon.MagnifyingGlass}
        title={searchText ? `Search "${searchText}"` : `Search ${searchEngine.s}`}
        subtitle={searchEngine.s}
        actions={action}
      />
    </List>
  );
}
