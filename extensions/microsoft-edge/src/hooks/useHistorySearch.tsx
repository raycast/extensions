import { Database } from "sql.js";
import { getProfileName, historyDbPath } from "../utils/pathUtils";
import { loadDataToLocalDb, termsAsParamNames, termsAsParams } from "../utils/sqlUtils";
import { NullableString, UrlDetail, UrlSearchResult } from "../schema/types";
import { useUrlSearch } from "./useUrlSearch";

const loadHistoryToLocalDb = async (): Promise<Database> => {
  const profileName = getProfileName();
  const dbPath = historyDbPath(profileName);
  return loadDataToLocalDb(dbPath, "sql-wasm.wasm");
};

const whereClauses = (terms: string[]) => {
  return termsAsParamNames(terms)
    .map((t) => `urls.title LIKE ${t}`)
    .join(" AND ");
};

const searchHistory = async (db: Database, query: NullableString): Promise<UrlDetail[]> => {
  const terms = query ? query.trim().split(" ") : [""];
  const queries = `SELECT
            id, url, title,
            datetime(last_visit_time / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime')
          FROM urls
          WHERE ${whereClauses(terms)}
          ORDER BY last_visit_time DESC LIMIT 30;`;
  const results = db.exec(queries, termsAsParams(terms));

  if (results.length !== 1) {
    return [];
  }

  return results[0].values.map((v) => ({
    id: v[0]?.toString() as string,
    url: v[1] as string,
    title: v[2] as string,
    lastVisited: new Date(v[3] as string),
  }));
};

export function useHistorySearch(query: NullableString): UrlSearchResult {
  return useUrlSearch<Database>(query, loadHistoryToLocalDb, searchHistory, "history");
}
