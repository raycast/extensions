import { Icon, LaunchProps, List } from "@raycast/api";
import { useState } from "react";
import { HistoryEntryListItem } from "./list";
import { useHistorySearch } from "./history";
import { VersionCheck } from "./version";

function SearchHistory(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const { data, isLoading, permissionView } = useHistorySearch(searchText);

  if (permissionView) {
    return permissionView;
  }

  return (
    <List
      searchBarPlaceholder="Search history"
      searchText={searchText}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found ¯\_(ツ)_/¯" />
      <List.Section
        title="History"
        subtitle={data ? `${data.length} ${data.length === 1 ? "entry" : "entries"}` : undefined}
      >
        {data?.map((entry) => <HistoryEntryListItem key={entry.id} entry={entry} searchText={searchText} />)}
      </List.Section>
    </List>
  );
}

export default function Command(props: LaunchProps) {
  return (
    <VersionCheck>
      <SearchHistory {...props} />
    </VersionCheck>
  );
}
