import { HISTORY_RESULT_LIMIT } from "../constants";

export interface HistoryItem {
  id: number;
  url: string;
  title: string;
  lastVisitedAt: string;
}

export function escapeSqlLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/'/g, "''");
}

export function buildHistoryQuery(searchText: string, limit = HISTORY_RESULT_LIMIT): string {
  const normalized = searchText.trim();
  const terms = normalized.length >= 2 ? normalized.split(/\s+/).filter(Boolean) : [];
  const filter = terms.length
    ? `AND ${terms
        .map((term) => {
          const value = escapeSqlLike(term);
          return `(title LIKE '%${value}%' ESCAPE '\\' OR url LIKE '%${value}%' ESCAPE '\\')`;
        })
        .join(" AND ")}`
    : "";
  const safeLimit = Math.max(1, Math.trunc(limit));

  return `
    SELECT id,
           url,
           COALESCE(NULLIF(title, ''), url) AS title,
           datetime(last_visit_time / 1000000 + strftime('%s', '1601-01-01'), 'unixepoch', 'localtime') AS lastVisitedAt
    FROM urls
    WHERE last_visit_time > 0
      AND (url LIKE 'http://%' OR url LIKE 'https://%')
      ${filter}
    GROUP BY url
    ORDER BY last_visit_time DESC
    LIMIT ${safeLimit};
  `;
}
