import { useEffect, useState } from "react";
import { UseDB } from "./useDB";
import { Block } from "./useSearch";
import {
  buildMatchQuery,
  documentize,
  limit,
  searchBlocks,
  searchQuery,
  searchQueryDocumentsOnEmptyParams,
} from "./common";

type UseDocumentSearch = {
  resultsLoading: boolean;
  results: DocBlock[];
};

export type DocBlock = {
  block: Block;
  blocks: Block[];
};

export default function useDocumentSearch({ databasesLoading, databases }: UseDB, text: string) {
  const [state, setState] = useState<UseDocumentSearch>({ resultsLoading: true, results: [] });

  useEffect(() => {
    if (databasesLoading) return;

    setState((prev) => ({ ...prev, resultsLoading: true }));

    const matchQuery = buildMatchQuery(text);
    const [query, params] =
      matchQuery.length > 0 ? [searchQuery, [matchQuery, limit]] : [searchQueryDocumentsOnEmptyParams, [limit]];

    const results = databases
      .map(({ database, spaceID }) => ({ database, spaceID, blocks: searchBlocks(database, spaceID, query, params) }))
      .map(({ database, spaceID, blocks }) => documentize(database, spaceID, blocks));

    setState({ resultsLoading: false, results: results.flat() });
  }, [databasesLoading, text]);

  return state;
}
