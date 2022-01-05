import { collectionsDbPath, getProfileName } from "../utils/pathUtils";
import { Database } from "sql.js";
import { decodeUint8ArrayBlob, loadDataToLocalDb, termsAsParamNames, termsAsParams } from "../utils/sqlUtils";
import { NullableString, UrlDetail, UrlSearchResult } from "../schema/types";
import { useUrlSearch } from "./useUrlSearch";

interface ItemSource {
  url: string;
  websiteName: string;
}

const loadCollectionsToLocalDb = async (): Promise<Database> => {
  const profileName = getProfileName();
  const dbPath = collectionsDbPath(profileName);
  return loadDataToLocalDb(dbPath, "sql-collections.wasm");
};

const whereClauses = (terms: string[]) => {
  return termsAsParamNames(terms)
    .map((t) => `items.title LIKE ${t}`)
    .concat("type = 'website'")
    .join(" AND ");
};

const searchCollection = async (db: Database, query: NullableString): Promise<UrlDetail[]> => {
  const terms = query ? query.trim().split(" ") : [""];
  const queries = `SELECT
            id, source, title, date_modified
          FROM items
          WHERE ${whereClauses(terms)}
          ORDER BY date_modified DESC LIMIT 50;`;
  const results = db.exec(queries, termsAsParams(terms));

  if (results.length !== 1) {
    return [];
  }

  return results[0].values.map((v) => {
    const source = decodeUint8ArrayBlob(v[1] as Uint8Array) as string;
    return {
      id: v[0] as string,
      url: (JSON.parse(source) as ItemSource).url as string,
      title: v[2] as string,
      lastVisited: new Date(v[3] as number),
    };
  });
};

export function useCollectionSearch(query: NullableString): UrlSearchResult {
  return useUrlSearch<Database>(query, loadCollectionsToLocalDb, searchCollection, "collections");
}
