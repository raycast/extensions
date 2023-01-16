import { Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { databasePath, getQuery, useSQL } from "./sql";
import { HistoryEntry } from "./types";
import { isPermissionError, PermissionErrorView } from "./permissions";
import { VersionCheck } from "./version";
import { HistoryEntryListItem } from "./list";

function SearchHistory() {
  const [searchText, setSearchText] = useState<string>();
  const { data, isLoading, error } = useSQL<HistoryEntry>(databasePath, getQuery(searchText));

  if (error) {
    if (isPermissionError(error)) {
      return <PermissionErrorView />;
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed searching history",
        message: error instanceof Error ? error.message : undefined,
      });
    }
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
