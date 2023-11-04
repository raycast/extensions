import * as fs from "fs";
import { useSQL } from "@raycast/utils";
import { HistoryEntry, SearchResult } from "../types/interfaces";
import { getCollectionsDbPath } from "../utils/pathUtils";
import { NoCollectionsError } from "../components/error/NoCollectionsError";
import { useIsAppInstalled } from "./useIsAppInstalled";

const whereClauses = (tableTitle: string, terms: string[]) => {
  return terms.map((t) => `${tableTitle}.title LIKE '%${t}%'`).join(" AND ");
};

const getCollectionQuery = (table: string, date_field: string, terms: string[]) =>
  `SELECT id,
            source as url,
            title,
            ${date_field} as lastVisited
     FROM ${table}
     WHERE ${whereClauses(table, terms)}
     ORDER BY ${date_field} DESC LIMIT 30;`;

export function useCollectionSearch(profile: string, query?: string): SearchResult<HistoryEntry> {
  const terms = query ? query.trim().split(" ") : [""];
  const queries = getCollectionQuery("items", "date_modified", terms);
  const dbPath = getCollectionsDbPath(profile);
  const { errorView } = useIsAppInstalled();

  if (errorView) {
    return { isLoading: false, data: [], errorView };
  }

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
}
