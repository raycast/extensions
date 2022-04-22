import { useEffect, useState } from "react";
import { UseDB } from "./useDB";
import { BindParams, Database, SqlValue } from "../../assets/sql-wasm-fts5";

export type Block = {
  id: string;
  spaceID: string;
  content: string;
  entityType: string;
  documentID: string;
  documentName: string;
};

const limit = 40;

const searchQuery = `
SELECT id, content, entityType, documentId
FROM BlockSearch(?)
ORDER BY rank + customRank
LIMIT ?
`;

const searchQueryOnEmptyParams = `
SELECT id, content, entityType, documentId
FROM BlockSearch
ORDER BY customRank
LIMIT ?
`;

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

    setState({ resultsLoading: false, results: blocksOfSpaces.flat() });
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

const uniqueDocumentIDsFromBlocks = (blocks: Block[]): string[] => [
  ...new Set(blocks.filter((block) => block.entityType !== "document").map((block) => block.documentID)),
];

const searchBlocks = (database: Database, spaceID: string, query: string, params: BindParams) =>
  database
    .exec(query, params)
    .map((res) => res.values)
    .flat()
    .map(sqlValueArr2Block(spaceID));

const sqlValueArr2Block =
  (spaceID: string) =>
  ([id, content, entityType, documentID]: SqlValue[]): Block =>
    ({ id, content, entityType, documentID, spaceID } as Block);

const buildMatchQuery = (str: string): string => {
  if (!str || str.length === 0) return "";

  const terms = termsForFTS5(str);
  const phrases = phrasesForFTS5(terms);

  return `{content exactMatchContent} : (${phrases.join(") OR (")})`;
};

const termsForFTS5 = (str: string): string[] =>
  str
    .split(/\s+/)
    .map((word) => word.trim())
    .map((word) => word.replace('"', ' '))
    .map((word) => `"${word}"`);

const phrasesForFTS5 = (terms: string[]): string[] => {
  const phrases = [terms.join(" "), terms.join(" ") + "*"];

  if (terms.length > 1) {
    phrases.push(terms.join("* ") + "*");
  }

  return phrases;
};
