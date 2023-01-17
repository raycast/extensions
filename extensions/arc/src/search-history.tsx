import { Icon, List } from "@raycast/api";
import { useState } from "react";
import { historyDatabasePath, getHistoryQuery } from "./sql";
import { HistoryEntry } from "./types";
import { VersionCheck } from "./version";
import { HistoryEntryListItem } from "./list";
import { useSQL } from "@raycast/utils";

function SearchHistory() {
  const [searchText, setSearchText] = useState<string>();
  const { data, isLoading, permissionView } = useSQL<HistoryEntry>(historyDatabasePath, getHistoryQuery(searchText));

  if (permissionView) {
    return permissionView;
  }

  return (
    <List searchBarPlaceholder="Search history" isLoading={isLoading} onSearchTextChange={setSearchText}>
      <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found ¯\_(ツ)_/¯" />
      {data?.map((entry) => (
        <HistoryEntryListItem key={entry.id} entry={entry} />
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <VersionCheck>
      <SearchHistory />
    </VersionCheck>
  );
}
