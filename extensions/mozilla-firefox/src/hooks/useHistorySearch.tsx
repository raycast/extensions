import { useSQL } from "@raycast/utils";
import { HistorySearchResults, HistoryEntry } from "../interfaces";
import { getHistoryDbPath } from "../util";

const whereClauses = (terms: string[]) => {
  return terms.map((t) => `moz_places.title LIKE ${t}`).join(" AND ");
};

const getHistoryQuery = (query?: string) => {
  const terms = query ? query.trim().split(" ") : [];
  const whereClause = terms.length > 0 ? `WHERE ${whereClauses(terms)}` : "";
  return `SELECT
            id, url, title,
            datetime(last_visit_date / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime') as lastVisited
          FROM moz_places
          ${whereClause}
          ORDER BY last_visit_date DESC LIMIT 30;`;
};

export function useHistorySearch(query: string | undefined): HistorySearchResults {
  const inQuery = getHistoryQuery(query);
  const dbPath = getHistoryDbPath();
  const { isLoading, data, permissionView } = useSQL<HistoryEntry>(dbPath, inQuery);
  return { entries: data, error: permissionView, isLoading };
}
