import { useEffect, useState } from "react";
import { UseDB } from "./useDB";
import {
  backfillBlocksWithDocumentNames,
  buildMatchQuery,
  limit,
  searchBlocks,
  searchQuery,
  searchQueryOnEmptyParams,
} from "./common";

export type Block = {
  id: string;
  spaceID: string;
  content: string;
  type: string;
  entityType: string;
  documentID: string;
  documentName: string;
};

export default function useSearch({ databasesLoading, databases }: UseDB, text: string) {
  const [state, setState] = useState({ resultsLoading: true, results: [] as Block[] });

  useEffect(() => {
    if (databasesLoading) return;

    setState((prev) => ({ ...prev, resultsLoading: true }));

    const matchQuery = buildMatchQuery(text);
    const [query, params] =
      matchQuery.length > 0 ? [searchQuery, [matchQuery, limit]] : [searchQueryOnEmptyParams, [limit]];

    const blocksOfSpaces = databases
      .map(({ database, spaceID }) => ({ database, blocks: searchBlocks(database, spaceID, query, params) }))
      .map(({ database, blocks }) => backfillBlocksWithDocumentNames(database, blocks));

    const results = blocksOfSpaces.flat();
    setState({ results, resultsLoading: false });
    console.debug(`got ${results.length} results for query search '${text}'`);
  }, [databasesLoading, text]);

  return state;
}
