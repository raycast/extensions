import { useState } from "react";
import useSearch from "./hooks/useSearch";
import ListBlocks from "./components/ListBlocks";
import useAppExists from "./hooks/useAppExists";
import useConfig from "./hooks/useConfig";
import useDB from "./hooks/useDB";
import AppNotInstalled from "./components/AppNotInstalled";

// noinspection JSUnusedGlobalSymbols
export default function search() {
  const appExists = useAppExists();
  const config = useConfig(appExists);
  const db = useDB(config);

  const [query, setQuery] = useState("");
  const { resultsLoading, results } = useSearch(db, query);

  const listBlocks = <ListBlocks isLoading={resultsLoading} onSearchTextChange={setQuery} blocks={results} />;
  return appExists.appExistsLoading
      ? listBlocks
      : appExists.appExists
          ? listBlocks
          : <AppNotInstalled />;
}
