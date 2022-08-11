import { List } from "@raycast/api";
import { useState } from "react";
import useSearch, { SearchResult } from "./hooks/useSearch";
import SearchResultItem from "./components/SearchResultItem";
import useAppExists from "./hooks/useAppExists";

const search = () => {
  const appExists = useAppExists();
  const [query, setQuery] = useState("");
  const { isLoading, results } = useSearch(appExists, query);

  const mapResult = (result: SearchResult) => <SearchResultItem key={result.uuid} result={result} />;

  const noApp = <List.EmptyView title="You need to have DEVONthink 3" icon="devonthink-icon-small.png" />;

  return (
    <List isLoading={isLoading || appExists.appExistsLoading} onSearchTextChange={setQuery} throttle>
      {appExists ? results.map(mapResult) : noApp}
    </List>
  );
};

// noinspection JSUnusedGlobalSymbols
export default search;
