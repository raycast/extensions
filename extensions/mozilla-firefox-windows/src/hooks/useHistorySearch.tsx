import { ReactElement } from "react";
import { existsSync } from "fs";
import { useSQL } from "@raycast/utils";
import { SearchResult, HistoryEntry } from "../interfaces";
import { getHistoryDbPath, searchWhereClause } from "../util";
import { NotInstalledError } from "../components";

const getHistoryQuery = (query?: string) =>
  `SELECT id, url, title,
          datetime(last_visit_date/1000000,'unixepoch') AS lastVisited
   FROM moz_places
   WHERE last_visit_date IS NOT NULL AND hidden = 0
   ${searchWhereClause(query, "title", "url")}
   ORDER BY last_visit_date DESC LIMIT 30;`;

export function useHistorySearch(query: string | undefined): SearchResult<HistoryEntry> {
  const dbPath = getHistoryDbPath();
  const dbExists = existsSync(dbPath);

  const { isLoading, data, permissionView } = useSQL<HistoryEntry>(dbPath, getHistoryQuery(query), {
    execute: dbExists,
  });

  if (!dbExists) {
    return { data: [], isLoading: false, errorView: <NotInstalledError /> };
  }

  return { data, isLoading, errorView: permissionView as ReactElement };
}
