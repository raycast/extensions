import { List, ActionPanel, Action } from "@raycast/api";
import { useState, useMemo } from "react";
import Fuse from "fuse.js";

import { DataType, clearCache } from "../utils/data.util";
import { useFetchData } from "../hooks/useFetchData";

interface SearchListProps<T> {
  dataKey: DataType;
  searchBarPlaceholder: string;
  renderItem: (identifier: string, item: T) => JSX.Element;
}

export function SearchList<T>({ dataKey, searchBarPlaceholder, renderItem }: SearchListProps<T>) {
  const { data, isLoading, setData } = useFetchData<T>(dataKey);
  const [searchText, setSearchText] = useState<string>("");

  const searchableData = useMemo(() => {
    return Object.entries(data || {}).map(([key, item]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemAny = item as any;

      return {
        id: key,
        originalData: [key, item] as [string, T],
        name: String(itemAny.name || ""),
        key: String(key),
      };
    });
  }, [data]);

  const fuse = useMemo(() => {
    return new Fuse(searchableData, {
      keys: [
        { name: "name", weight: 0.7 },
        { name: "key", weight: 0.5 },
      ],
      threshold: 0.3,
      includeScore: true,
    });
  }, [searchableData]);

  const filteredEntries = useMemo(() => {
    if (!searchText || searchText.trim() === "") {
      return Object.entries(data || {}) as [string, T][];
    }

    const results = fuse.search(searchText.trim());
    return results.map((result) => result.item.originalData);
  }, [searchText, fuse, data]);

  const handleReload = () => {
    clearCache();
    setData({});
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={searchBarPlaceholder}
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action title="Reload" onAction={handleReload} />
        </ActionPanel>
      }
    >
      {filteredEntries.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No results found"
          description={searchText ? `No items match "${searchText}"` : "No data available"}
        />
      ) : (
        filteredEntries.map(([key, item]) => renderItem(key, item))
      )}
    </List>
  );
}
