import { useState } from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { useFetchData } from "../hooks/useFetchData";

interface SearchListProps<T> {
  dataKey: "ports" | "styles";
  searchBarPlaceholder: string;
  renderItem: (itemKey: string, itemDetails: T) => JSX.Element;
  filterFunction: (itemKey: string, itemDetails: T, searchText: string) => boolean;
}

export function SearchList<T>({ dataKey, searchBarPlaceholder, renderItem, filterFunction }: SearchListProps<T>) {
  const { data, isLoading, setData } = useFetchData<T>(dataKey);
  const [searchText, setSearchText] = useState<string>("");

  const entries = Object.entries(data) as [string, T][];
  const filteredData = entries.filter(([key, value]) => filterFunction(key, value, searchText));

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={searchBarPlaceholder}
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={() => setData({})} />
        </ActionPanel>
      }
    >
      {filteredData.map(([key, value]) => renderItem(key, value))}
    </List>
  );
}
