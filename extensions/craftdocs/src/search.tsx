import { useState } from "react";
import useSearch, { Block } from "./hooks/useSearch";
import ListBlocks from "./components/ListBlocks";
import useAppExists from "./hooks/useAppExists";
import useConfig from "./hooks/useConfig";
import useDB from "./hooks/useDB";
import AppNotInstalled from "./components/AppNotInstalled";
import Config from "./Config";

// noinspection JSUnusedGlobalSymbols
export default function search() {
  const appExists = useAppExists();
  const config = useConfig(appExists);
  const db = useDB(config);

  const [query, setQuery] = useState("");
  const { resultsLoading, results } = useSearch(db, query);

  const listBlocks = ListBlocksComponent({ resultsLoading, setQuery, results, query, config: config.config });
  const listOrInfo = appExists.appExists ? listBlocks : <AppNotInstalled />;

  return appExists.appExistsLoading ? listBlocks : listOrInfo;
}

type ListBlockComponentParams = {
  config: Config | null;
  resultsLoading: boolean;
  query: string;
  setQuery: (query: string) => void;
  results: Block[];
};

const ListBlocksComponent = ({ config, resultsLoading, results, query, setQuery }: ListBlockComponentParams) => (
  <ListBlocks isLoading={resultsLoading} onSearchTextChange={setQuery} blocks={results} query={query} config={config} />
);
