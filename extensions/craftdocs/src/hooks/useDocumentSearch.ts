import { useEffect, useState } from "react";
import { UseDB } from "./useDB";
import { Block } from "./useSearch";
import {
  buildMatchQuery,
  limit,
  searchBlocks,
  searchQuery,
  searchQueryDocumentsOnEmptyParams,
  sqlValueArr2Block,
  uniqueDocumentIDsFromBlocks,
} from "./common";
import { Database } from "../../assets/sql-wasm-fts5";

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

const documentize = (database: Database, spaceID: string, blocks: Block[]) => {
  const documentIDs = uniqueDocumentIDsFromBlocks(blocks);
  const placeholders = new Array(documentIDs.length).fill("?").join(", ");
  const sql = `SELECT id, content, type, entityType, documentId FROM BlockSearch WHERE documentId in (${placeholders})`;

  return database
    .exec(sql, documentIDs)
    .map((res) => res.values)
    .flat()
    .reduce((acc, val) => {
      const block = sqlValueArr2Block(spaceID)(val);
      let obj = acc.find((item) => item.block.documentID === block.documentID);
      if (!obj) {
        obj =
          block.entityType === "document"
            ? ({ block, blocks: [] } as DocBlock)
            : ({ block: { documentID: block.documentID }, blocks: [block] } as DocBlock);

        acc.push(obj);
      } else {
        if (block.entityType === "document") {
          obj.block = block;
        } else {
          obj.blocks.push(block);
        }
      }

      return acc;
    }, [] as DocBlock[]);
};
