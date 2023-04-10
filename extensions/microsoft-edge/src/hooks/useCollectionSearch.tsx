import * as fs from "fs";
import { useSQL } from "@raycast/utils";
import { HistoryEntry, SearchResult } from "../interfaces";
import { getCollectionsDbPath } from "../util";
import { NoCollectionsError } from "../components/error/NoCollectionsError";

const whereClauses = (tableTitle: string, terms: string[]) => {
  return terms.map((t) => `${tableTitle}.title LIKE '%${t}%'`).join(" AND ");
};

const getHistoryQuery = (table: string, date_field: string, terms: string[]) =>
  `SELECT id,
            source as url,
            title,
            ${date_field} as lastVisited
     FROM ${table}
     WHERE ${whereClauses(table, terms)}
     ORDER BY ${date_field} DESC LIMIT 30;`;

const searchCollection = (profile: string, query?: string): SearchResult<HistoryEntry> => {
  const terms = query ? query.trim().split(" ") : [""];
  const queries = getHistoryQuery("items", "date_modified", terms);
  const dbPath = getCollectionsDbPath(profile);

  if (!fs.existsSync(dbPath)) {
    return { isLoading: false, data: [], errorView: <NoCollectionsError /> };
  }

  const { data, isLoading, permissionView, revalidate } = useSQL<HistoryEntry>(dbPath, queries);
  return {
    data: data?.map((d) => ({ ...d, url: JSON.parse(d.url).url })),
    isLoading,
    errorView: permissionView,
    revalidate,
  };
};

export function useCollectionSearch(profile: string, query?: string): SearchResult<HistoryEntry> {
  return searchCollection(profile, query);
}
