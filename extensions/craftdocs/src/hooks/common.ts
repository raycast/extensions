import { BindParams, Database, SqlValue } from "../../assets/sql-wasm-fts5";
import { Block } from "./useSearch";

export const searchQuery = `
SELECT id, content, type, entityType, documentId
FROM BlockSearch(?)
ORDER BY rank + customRank
LIMIT ?
`;

export const searchQueryOnEmptyParams = `
SELECT id, content, type, entityType, documentId
FROM BlockSearch
ORDER BY customRank
LIMIT ?
`;

export const searchQueryDocumentsOnEmptyParams = `
SELECT id, content, type, entityType, documentId
FROM BlockSearch
WHERE entityType = 'document'
ORDER BY customRank
LIMIT ?
`;

export const limit = 40;

export const buildMatchQuery = (str: string): string => {
  if (!str || str.length === 0) return "";

  const terms = termsForFTS5(str);
  const phrases = phrasesForFTS5(terms);

  return `{content exactMatchContent} : (${phrases.join(") OR (")})`;
};

export const searchBlocks = (database: Database, spaceID: string, query: string, params: BindParams) =>
  database
    .exec(query, params)
    .map((res) => res.values)
    .flat()
    .map(sqlValueArr2Block(spaceID));

export const uniqueDocumentIDsFromBlocks = (blocks: Block[]): string[] => [
  ...new Set(blocks.map((block) => block.documentID)),
];

const termsForFTS5 = (str: string): string[] =>
  str
    .split(/\s+/)
    .map((word) => word.trim())
    .map((word) => word.replace('"', " "))
    .map((word) => `"${word}"`);

const phrasesForFTS5 = (terms: string[]): string[] => {
  const phrases = [terms.join(" "), terms.join(" ") + "*"];

  if (terms.length > 1) {
    phrases.push(terms.join("* ") + "*");
  }

  return phrases;
};

export const sqlValueArr2Block =
  (spaceID: string) =>
  ([id, content, type, entityType, documentID]: SqlValue[]): Block =>
    ({ id, content, type, entityType, documentID, spaceID } as Block);
