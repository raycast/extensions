import { existsSync } from "fs";
import { BraveProfile, HistoryEntry, SearchResult } from "../interfaces";
import { getHistoryDbPath } from "../util";
import { useEffect, useMemo, useState } from "react";
import { useSQL } from "@raycast/utils";

// useSQL validates its database path even when execution is disabled. The
// bundled command file is a safe existing path to pass while no History
// database is available; execute: false ensures it is never queried.
const FALLBACK_DATABASE_PATH = __filename;

const whereClauses = (tableTitle: string, terms: string[]) => {
  return terms.map((t) => `(${tableTitle}.title LIKE '%${t}%' OR ${tableTitle}.url LIKE '%${t}%')`).join(" AND ");
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

  const availableProfiles = useMemo(
    () => profiles.filter((profile) => existsSync(getHistoryDbPath(profile.id))),
    [profiles],
  );
  const currentProfile = availableProfiles[currentProfileIndex];
  const dbPath = currentProfile ? getHistoryDbPath(currentProfile.id) : FALLBACK_DATABASE_PATH;

  const terms = query ? query.trim().split(" ") : [""];
  const historyQuery = getHistoryQuery("urls", "last_visit_time", terms);

  const { data, isLoading, permissionView, revalidate } = useSQL<HistoryEntry>(dbPath, historyQuery, {
    execute: Boolean(currentProfile),
  });

  useEffect(() => {
    setProfileHistories({});
    setCurrentProfileIndex(0);
  }, [profiles, query]);

  useEffect(() => {
    if (currentProfile && data != undefined && !isLoading) {
      setProfileHistories((histories) => ({
        ...histories,
        [currentProfile.id]: {
          data,
          isLoading,
          errorView: permissionView,
          revalidate,
          profile: currentProfile,
        },
      }));

      if (currentProfileIndex < availableProfiles.length - 1) {
        setCurrentProfileIndex((index) => index + 1);
      }
    }
  }, [availableProfiles.length, currentProfile, currentProfileIndex, data, isLoading, permissionView, revalidate]);

  return Object.values(profileHistories);
}
