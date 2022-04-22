import { useState } from "react";
import useSearch from "./hooks/useSearch";
import ListBlocks from "./components/ListBlocks";
import useAppExists, { UseAppExists } from "./hooks/useAppExists";
import useConfig, { UseConfig } from "./hooks/useConfig";
import useDB, { UseDB } from "./hooks/useDB";
import AppNotInstalled from "./components/AppNotInstalled";
import { getPreferenceValues } from "@raycast/api";
import useDocumentSearch from "./hooks/useDocumentSearch";
import ListDocBlocks from "./components/ListDocBlocks";

const { useDetailedView } = getPreferenceValues();

// noinspection JSUnusedGlobalSymbols
export default function search() {
  const appExists = useAppExists();
  const config = useConfig(appExists);
  const db = useDB(config);

  const [query, setQuery] = useState("");
  const params = { appExists, db, query, setQuery, config };

  return useDetailedView ? handleDetailedView(params) : handleListView(params);
}

type ViewParams = {
  appExists: UseAppExists;
  db: UseDB;
  query: string;
  setQuery: (query: string) => void;
  config: UseConfig;
};

const handleListView = ({ appExists, db, query, setQuery, config }: ViewParams) => {
  const { resultsLoading, results } = useSearch(db, query);

  const listBlocks = (
    <ListBlocks
      isLoading={resultsLoading}
      onSearchTextChange={setQuery}
      blocks={results}
      query={query}
      config={config.config}
    />
  );

  const listOrInfo = appExists.appExists ? listBlocks : <AppNotInstalled />;

  return appExists.appExistsLoading ? listBlocks : listOrInfo;
};

const handleDetailedView = ({ appExists, db, query, setQuery, config }: ViewParams) => {
  const { resultsLoading, results } = useDocumentSearch(db, query);

  const listDocuments = (
    <ListDocBlocks
      resultsLoading={resultsLoading}
      setQuery={setQuery}
      results={results}
      query={query}
      config={config.config}
    />
  );

  const listOrInfo = appExists.appExists ? listDocuments : <AppNotInstalled />;

  return appExists.appExistsLoading ? listDocuments : listOrInfo;
};
