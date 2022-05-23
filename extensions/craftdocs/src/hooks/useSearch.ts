import { useEffect, useState } from "react";
import { UseDB } from "./useDB";
import { Database } from "../../assets/sql-wasm-fts5";
import {
  buildMatchQuery,
  limit,
  searchBlocks,
  searchQuery,
  searchQueryOnEmptyParams,
  uniqueDocumentIDsFromBlocks,
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

const backfillBlocksWithDocumentNames = (database: Database, blocks: Block[]) => {
  const documentIDs = uniqueDocumentIDsFromBlocks(blocks);
  const placeholders = new Array(documentIDs.length).fill("?").join(", ");
  const sql = `select documentId, content from BlockSearch where entityType = 'document' and documentId in (${placeholders})`;

  database
    .exec(sql, documentIDs)
    .map((res) => res.values)
    .flat()
    .map(([documentID, content]) =>
      blocks
        .filter((block) => block.documentID === documentID)
        .forEach((block) => (block.documentName = content as string))
    );

  return blocks;
};
