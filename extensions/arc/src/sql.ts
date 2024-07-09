import { homedir } from "os";
import { join } from "path";

export const historyDatabasePath = join(
  homedir(),
  "Library",
  "Application Support",
  "Arc",
  "User Data",
  "Default",
  "History",
);

export function getHistoryQuery(searchText?: string, limit = 100) {
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

export function getDownloadQuery(searchText?: string, limit = 100) {
  const whereClause = searchText
    ? searchText
        .split(" ")
        .filter((word) => word.length > 0)
        .map((term) => `(current_path LIKE "%${term}%" OR tab_url LIKE "%${term}%")`)
        .join(" AND ")
    : undefined;

  return `
    SELECT id, 
          current_path, 
          target_path, 
          tab_url, 
          datetime(end_time / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime') As download_time 
    FROM downloads 
    ${whereClause ? `WHERE ${whereClause}` : ""}
    ORDER BY id DESC
    LIMIT ${limit};
  `;
}
