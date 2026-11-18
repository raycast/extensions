import type { Database, Statement } from "sql.js";

export type FaviconRow = {
  bitmapId?: number;
  imageData?: Uint8Array;
};

const EXACT_FAVICON_QUERY = `
  SELECT
    b.id AS bitmapId,
    b.image_data AS imageData
  FROM icon_mapping m
  JOIN favicon_bitmaps b ON b.icon_id = m.icon_id
  WHERE m.page_url IN ($exact, $withoutHash, $originRoot)
  ORDER BY
    CASE
      WHEN m.page_url = $exact THEN 0
      WHEN m.page_url = $withoutHash THEN 1
      ELSE 2
    END,
    CASE WHEN b.width >= 32 THEN 0 ELSE 1 END,
    ABS(b.width - 32)
  LIMIT 1
`;

const ORIGIN_FAVICON_QUERY = `
  SELECT
    b.id AS bitmapId,
    b.image_data AS imageData
  FROM icon_mapping m
  JOIN favicon_bitmaps b ON b.icon_id = m.icon_id
  WHERE m.page_url >= $originRoot AND m.page_url < $originUpperBound
  ORDER BY
    CASE WHEN b.width >= 32 THEN 0 ELSE 1 END,
    ABS(b.width - 32)
  LIMIT 1
`;

function getLookupURLs(url: string) {
  const parsed = new URL(url);
  parsed.hash = "";

  const originRoot = `${parsed.origin}/`;
  return {
    exact: url,
    withoutHash: parsed.toString(),
    originRoot,
    originUpperBound: `${originRoot}\uffff`,
  };
}

function readRow(statement: Statement, parameters: Record<string, string>) {
  try {
    statement.bind(parameters);
    return statement.step() ? (statement.getAsObject() as FaviconRow) : undefined;
  } finally {
    statement.reset();
  }
}

export function createFaviconLookup(database: Database) {
  const exactStatement = database.prepare(EXACT_FAVICON_QUERY);
  let originStatement: Statement;

  try {
    originStatement = database.prepare(ORIGIN_FAVICON_QUERY);
  } catch (error) {
    exactStatement.free();
    throw error;
  }

  return {
    find(url: string) {
      const lookupURLs = getLookupURLs(url);
      return (
        readRow(exactStatement, {
          $exact: lookupURLs.exact,
          $withoutHash: lookupURLs.withoutHash,
          $originRoot: lookupURLs.originRoot,
        }) ??
        readRow(originStatement, {
          $originRoot: lookupURLs.originRoot,
          $originUpperBound: lookupURLs.originUpperBound,
        })
      );
    },
    close() {
      exactStatement.free();
      originStatement.free();
    },
  };
}
