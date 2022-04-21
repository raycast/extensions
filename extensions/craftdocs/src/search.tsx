import { useState } from "react";
import useSearch from "./hooks/useSearch";
import ListBlocks from "./components/ListBlocks";
import useAppExists from "./hooks/useAppExists";
import useConfig from "./hooks/useConfig";
import useDB from "./hooks/useDB";

// noinspection JSUnusedGlobalSymbols
export default function search() {
  const appExists = useAppExists();
  const config = useConfig(appExists);
  const db = useDB(config);

  const [query, setQuery] = useState("");
  const { resultsLoading, results } = useSearch(db, query);

  return <ListBlocks isLoading={resultsLoading} onSearchTextChange={setQuery} blocks={results} />;
}
