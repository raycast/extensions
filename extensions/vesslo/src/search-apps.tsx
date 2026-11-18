import { ActionPanel, Icon, List } from "@raycast/api";
import { useState, useMemo } from "react";
import { SharedAppListItem } from "./components/SharedAppListItem";
import { useVessloData } from "./utils/useVessloData";
import {
  DataStateNotice,
  ReloadDataAction,
} from "./components/DataStateNotice";
import { TaggedApps } from "./browse-by-tag";
import { searchApps, SearchScope } from "./utils/search-filter";

export default function SearchApps() {
  const [searchText, setSearchText] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const { data, isLoading, state, refresh } = useVessloData();
  const searchResults = useMemo(
    () => searchApps(data?.apps ?? [], searchText, scope),
    [data, searchText, scope],
  );

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder="Search apps by name, Bundle ID, developer, tag, or memo..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search Field"
          value={scope}
          onChange={(value) => setScope(value as SearchScope)}
        >
          <List.Dropdown.Item title="All Fields" value="all" />
          <List.Dropdown.Item title="Name" value="name" />
          <List.Dropdown.Item title="Bundle ID" value="bundleId" />
          <List.Dropdown.Item title="Developer" value="developer" />
          <List.Dropdown.Item title="Tag" value="tag" />
          <List.Dropdown.Item title="Memo" value="memo" />
        </List.Dropdown>
      }
    >
      <DataStateNotice state={state} refresh={refresh} />
      {!data ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Vesslo data not found"
          description="Please run Vesslo app to export data"
          actions={
            <ActionPanel>
              <ReloadDataAction refresh={refresh} />
            </ActionPanel>
          }
        />
      ) : searchResults.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No apps found"
          description="Try a different search term or choose All Fields"
          actions={
            <ActionPanel>
              <ReloadDataAction refresh={refresh} />
            </ActionPanel>
          }
        />
      ) : (
        searchResults.map((result) => (
          <SharedAppListItem
            key={result.app.id}
            app={result.app}
            state={state}
            matchedFields={result.matchedFields}
            searchMatchDescription={result.matchDescription}
            onRefresh={refresh}
            tagNavigation={(tag) => <TaggedApps tag={tag} />}
          />
        ))
      )}
    </List>
  );
}
