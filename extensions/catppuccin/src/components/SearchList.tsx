import { useState } from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { useFetchData } from "../hooks/useFetchData";
import Fuse, { IFuseOptions } from "fuse.js";
import { DataType } from "../utils/data.util";

interface SearchListProps<T> {
  dataKey: DataType;
  searchBarPlaceholder: string;
  renderItem: (identifier: string, item: T) => JSX.Element;
}

export function SearchList<T>({ dataKey, searchBarPlaceholder, renderItem }: SearchListProps<T>) {
  const { data, isLoading, setData } = useFetchData<T>(dataKey);
  const [searchText, setSearchText] = useState<string>("");

  const fuseOptions = {
    keys: ["identifier"],
    threshold: 0.5,
  } satisfies IFuseOptions<unknown>;
  const fuse = new Fuse(Object.values(data), fuseOptions);
  const filteredData = fuse.search(searchText).map((result) => result.item) as [string, T][];

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
