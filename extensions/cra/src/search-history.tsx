import { Icon, LaunchProps, List } from "@raycast/api";
import { useState } from "react";
import { ErrorEmptyView } from "./components/error-view";
import { HistoryEntryListItem } from "./list";
import { useHistorySearch } from "./history";

function SearchHistory(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const { data, isLoading, permissionView, error, revalidate } = useHistorySearch(searchText);

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
      {error ? (
        <ErrorEmptyView title="Could not read Cra history" error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found ¯\_(ツ)_/¯" />
      )}
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
  return <SearchHistory {...props} />;
}
