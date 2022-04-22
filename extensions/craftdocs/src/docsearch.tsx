import useAppExists from "./hooks/useAppExists";
import useConfig from "./hooks/useConfig";
import useDB from "./hooks/useDB";
import { useState } from "react";
import useDocumentSearch from "./hooks/useDocumentSearch";
import ListDocBlocks from "./components/ListDocBlocks";

// noinspection JSUnusedGlobalSymbols
export default function docsearch() {
  const appExists = useAppExists();
  const config = useConfig(appExists);
  const db = useDB(config);

  const [query, setQuery] = useState("");
  const { resultsLoading, results } = useDocumentSearch(db, query);

  return (
    <ListDocBlocks
      resultsLoading={resultsLoading}
      setQuery={setQuery}
      results={results}
      query={query}
      config={config.config}
    />
  );
}
