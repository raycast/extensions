import {List} from "@raycast/api";
import {useState} from "react";
import useSearch from "./hooks/useSearch";

const search = () => {
  const [query, setQuery] = useState("");
  const {isLoading, results} = useSearch(query);

  return <List isLoading={isLoading} onSearchTextChange={setQuery}>
    {results.map(result => <List.Item key={result.uuid} title={result.name}/>)}
  </List>
};

// noinspection JSUnusedGlobalSymbols
export default search;
