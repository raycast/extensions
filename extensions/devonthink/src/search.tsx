import {List} from "@raycast/api";
import {useState} from "react";
import useSearch, {SearchResult} from "./hooks/useSearch";
import SearchResultItem from "./components/SearchResultItem";

const search = () => {
  const [query, setQuery] = useState("");
  const {isLoading, results} = useSearch(query);

  const mapResult = (result: SearchResult) => <SearchResultItem key={result.uuid} result={result}/>;

  return <List isLoading={isLoading} onSearchTextChange={setQuery} throttle>
    {results.map(mapResult)}
  </List>
};

// noinspection JSUnusedGlobalSymbols
export default search;
