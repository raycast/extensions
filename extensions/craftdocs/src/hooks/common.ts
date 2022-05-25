import { BindParams, Database, SqlValue } from "../../assets/sql-wasm-fts5";
import { Block } from "./useSearch";
import { DocBlock } from "./useDocumentSearch";

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

export const searchBlocks = (database: Database, spaceID: string, query: string, params: BindParams): Block[] => {
  try {
    return database
      .exec(query, params)
      .map((res) => res.values)
      .flat()
      .map(sqlValueArr2Block(spaceID));
  } catch (e) {
    console.error(`db exec error: ${e}`);

    return [];
  }
};

export const backfillBlocksWithDocumentNames = (database: Database, blocks: Block[]): Block[] => {
  if (blocks.length === 0) {
    return [];
  }

  const documentIDs = uniqueDocumentIDsFromBlocks(blocks);
  const placeholders = new Array(documentIDs.length).fill("?").join(", ");
  const sql = `select documentId, content from BlockSearch where entityType = 'document' and documentId in (${placeholders})`;

  try {
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
  } catch (e) {
    console.error(`db exec error: ${e}`);

    return [];
  }
};

export const documentize = (database: Database, spaceID: string, blocks: Block[]): DocBlock[] => {
  if (blocks.length === 0) {
    return [];
  }

  const documentIDs = uniqueDocumentIDsFromBlocks(blocks);
  const placeholders = new Array(documentIDs.length).fill("?").join(", ");
  const sql = `SELECT id, content, type, entityType, documentId FROM BlockSearch WHERE documentId in (${placeholders})`;

  try {
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
  } catch (e) {
    console.error(`db exec error: ${e}`);

    return [];
  }
};

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
