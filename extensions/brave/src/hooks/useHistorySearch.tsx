import { existsSync } from "fs";
import { BraveProfile, HistoryEntry, SearchResult } from "../interfaces";
import { getHistoryDbPath } from "../util";
import { useEffect, useState } from "react";
import { useSQL } from "@raycast/utils";

const whereClauses = (tableTitle: string, terms: string[]) => {
  return terms.map((t) => `${tableTitle}.title LIKE '%${t}%'`).join(" AND ");
};

const getHistoryQuery = (table: string, date_field: string, terms: string[]) =>
  `SELECT id,
            url,
             title,
             datetime(${date_field} / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime') as lastVisited
      FROM ${table}
      WHERE ${whereClauses(table, terms)}
      ORDER BY ${date_field} DESC LIMIT 100;`;

export function useHistorySearch(profiles: BraveProfile[], query?: string): SearchResult<HistoryEntry>[] {
  const [profileHistories, setProfileHistories] = useState<{ [id: string]: SearchResult<HistoryEntry> }>({});
  const [currentProfileIndex, setCurrentProfileIndex] = useState<number>(0);
  const [dbPath, setDbPath] = useState<string>(getHistoryDbPath(profiles[0].id));

  const terms = query ? query.trim().split(" ") : [""];
  const historyQuery = getHistoryQuery("urls", "last_visit_time", terms);

  const { data, isLoading, permissionView, revalidate } = useSQL<HistoryEntry>(dbPath, historyQuery);

  useEffect(() => {
    if (data != undefined && !isLoading) {
      const newHistories = { ...profileHistories };
      newHistories[profiles[currentProfileIndex].id] = {
        data,
        isLoading,
        errorView: permissionView,
        revalidate,
        profile: profiles[currentProfileIndex],
      };
      setProfileHistories(newHistories);

      if (
        currentProfileIndex < profiles.length - 1 &&
        existsSync(getHistoryDbPath(profiles[currentProfileIndex + 1].id))
      ) {
        setDbPath(getHistoryDbPath(profiles[currentProfileIndex + 1].id));
        setCurrentProfileIndex(currentProfileIndex + 1);
      }
    }
  }, [data, dbPath, isLoading]);

  useEffect(() => {
    revalidate();
  }, [currentProfileIndex]);

  return Object.values(profileHistories);
}
