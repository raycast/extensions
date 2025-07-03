import { homedir } from "os";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { HistoryEntry } from "./types";
import { useSQL, executeSQL } from "@raycast/utils";

const BASE_PATH = join(homedir(), "Library", "Application Support", "Arc", "User Data");
const HISTORY_FILENAME = "History";
const PREFERENCES_FILENAME = "Preferences";

function getProfileName(profileId: string): string | undefined {
  try {
    const path = join(BASE_PATH, profileId, PREFERENCES_FILENAME);
    const preferences = JSON.parse(readFileSync(path, "utf8"));
    return preferences?.profile?.name;
  } catch {
    return undefined;
  }
}

const profileHistoryDatabasePaths: {
  id: string;
  name: string | undefined;
  historyDatabasePath: string;
}[] = [];

export const defaultHistoryDatabasePath = join(BASE_PATH, "Default", HISTORY_FILENAME);

profileHistoryDatabasePaths.push({
  id: "Default",
  name: getProfileName("Default"),
  historyDatabasePath: defaultHistoryDatabasePath,
});

// Limit to a sane number of profiles
for (let profileNumber = 1; profileNumber < 5; profileNumber++) {
  const profileId = `Profile ${profileNumber}`;
  const historyPath = join(BASE_PATH, profileId, HISTORY_FILENAME);
  const exists = existsSync(historyPath);
  if (!exists) {
    // Assume profiles are always enumerated sequentially. This means there are
    // no more profiles.
    break;
  }
  const profileName = getProfileName(profileId);
  if (profileName !== "__ARC_SYSTEM_PROFILE") {
    profileHistoryDatabasePaths.push({
      id: profileId,
      name: profileName,
      historyDatabasePath: historyPath,
    });
  }
}

export { profileHistoryDatabasePaths };

export function getHistoryQuery(searchText?: string, limit = 200) {
  const whereClause = searchText
    ? searchText
        .split(" ")
        .filter((word) => word.length > 0)
        .map((term) => `(url LIKE "%${term}%" OR title LIKE "%${term}%")`)
        .join(" AND ")
    : undefined;

  return `
    SELECT id,
          url,
          title,
          datetime(last_visit_time / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime') AS lastVisitedAt
    FROM urls
    ${whereClause ? `WHERE ${whereClause}` : ""}
    GROUP BY url
    ORDER BY last_visit_time DESC
    LIMIT ${limit};
  `;
}

type HistorySqlRow = {
  id: number;
  url: string;
  title: string;
  lastVisitedAt: string;
};

export function useHistorySearch(
  searchText: string,
  limit?: number,
): { data: HistoryEntry[] | undefined; isLoading: boolean; permissionView: JSX.Element | undefined } {
  const escapedSearchText = searchText.replace(/"/g, '""');

  let permissionView: JSX.Element | undefined;
  let isLoading = false;
  const data: HistoryEntry[] = [];
  const multiProfile = profileHistoryDatabasePaths.length > 1;

  // Usually calling a hook within a loop is a no-no, but in this case it's ok
  // since the array we're looping over is static at runtime.
  for (const profile of profileHistoryDatabasePaths) {
    const sqlResponse = useSQL<HistorySqlRow>(profile.historyDatabasePath, getHistoryQuery(escapedSearchText, limit));

    // If at least one data source is still loading, isLoading should be true
    if (sqlResponse.isLoading) {
      isLoading = true;
    }

    // Set the last required permission view
    permissionView = sqlResponse.permissionView;

    // We're only adding the profile name if there are multiple profiles,
    // otherwise we'd waste space in the UI
    const profileLabel = profile.name || profile.id;
    const profileName = multiProfile ? profileLabel : undefined;

    const restructured = sqlResponse?.data?.map((value) => ({
      ...value,
      profileName,
    }));

    if (restructured) {
      // Merge the data
      data.push(...restructured);
    }
  }

  // Sort the data by lastVisitedAt
  data.sort((a, b) => {
    return new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime();
  });

  return {
    data,
    isLoading,
    permissionView,
  };
}

export async function getHistory(searchText?: string, limit = 200): Promise<HistoryEntry[]> {
  const data: HistoryEntry[] = [];

  for (const profile of profileHistoryDatabasePaths) {
    try {
      const query = getHistoryQuery(searchText, limit);
      const rows = await executeSQL<HistorySqlRow>(profile.historyDatabasePath, query);

      const restructured = rows.map((row: HistorySqlRow) => ({
        ...row,
        profileName: profile.name || profile.id,
      }));
      data.push(...restructured);
    } catch (error) {
      console.error(`Error fetching history for profile ${profile.id}:`, error);
    }
  }

  data.sort((a, b) => new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime());
  return data;
}
