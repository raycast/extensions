import { getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import useSearch from "./hooks/useSearch";
import SearchResultItem from "./components/SearchResultItem";
import useAppExists from "./hooks/useAppExists";
import useDevonDB from "./hooks/useDevonDB";
import { Preferences } from "./types/Preferences";
import { SearchResult } from "./types/SearchResult";

const search = () => {
  const appExists = useAppExists();
  const [query, setQuery] = useState("");
  const [databaseUUID, setDatabaseUUID] = useState("");
  const { isLoading, results } = useSearch(appExists, query, databaseUUID);
  const { databasesAreLoading, databases } = useDevonDB(appExists);
  const preferences = getPreferenceValues() as Preferences;

  const mapResult = (result: SearchResult) => <SearchResultItem key={result.uuid} result={result} />;

  const noApp = <List.EmptyView title="You need to have DEVONthink installed" icon="devonthink-icon-small.png" />;

  return (
    <List
      isLoading={appExists.appExistsLoading || isLoading || databasesAreLoading}
      searchBarPlaceholder="Search DEVONthink Database..."
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <List.Dropdown tooltip="Select database" onChange={setDatabaseUUID} storeValue>
          <List.Dropdown.Item title="All databases" value="" />
          <List.Dropdown.Section title="Specific database">
            {databases.map(({ name, uuid }) => (
              <List.Dropdown.Item key={uuid} title={name} value={uuid} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      isShowingDetail={preferences.searchIsShowingDetail && results.length > 0}
      throttle
    >
      {appExists.appExists ? results.map(mapResult) : noApp}
    </List>
  );
};

// noinspection JSUnusedGlobalSymbols
export default search;
