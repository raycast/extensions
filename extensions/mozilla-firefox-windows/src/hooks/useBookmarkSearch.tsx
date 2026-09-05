import { ReactElement } from "react";
import { existsSync } from "fs";
import { useSQL } from "@raycast/utils";
import { SearchResult, HistoryEntry } from "../interfaces";
import { getHistoryDbPath, searchWhereClause } from "../util";
import { NotInstalledError } from "../components";

// Bookmarks live in the same places.sqlite as the history (moz_bookmarks.type = 1 → bookmark).
const getBookmarkQuery = (query?: string) =>
  `SELECT b.id AS id, p.url AS url, b.title AS title,
          datetime(b.dateAdded/1000000,'unixepoch','localtime') AS lastVisited
   FROM moz_bookmarks b
   JOIN moz_places p ON b.fk = p.id
   WHERE b.type = 1
   ${searchWhereClause(query, "b.title", "p.url")}
   ORDER BY b.dateAdded DESC LIMIT 100;`;

export function useBookmarkSearch(query: string | undefined): SearchResult<HistoryEntry> {
  const dbPath = getHistoryDbPath();
  const dbExists = existsSync(dbPath);

  const { isLoading, data, permissionView } = useSQL<HistoryEntry>(dbPath, getBookmarkQuery(query), {
    execute: dbExists,
  });

  if (!dbExists) {
    return { data: [], isLoading: false, errorView: <NotInstalledError /> };
  }

  return { data, isLoading, errorView: permissionView as ReactElement };
}
