import { getHistoryPath, splitSearchTerms } from "src/utils";
import { HistoryItem } from "../types";
import { useSQL } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";

const LIMIT = 100;

// Seconds between the Unix epoch (1970-01-01) and the Core Data/WebKit
// reference date (2001-01-01).
const CORE_DATA_EPOCH_OFFSET_SECONDS = 978307200;

// Depending on the Orion version, history_items.LAST_VISIT_TIME comes back
// either as an already-formatted local datetime string or as a raw Core
// Data/WebKit epoch number (seconds since 2001-01-01). Passing the latter
// straight to `new Date(...)` silently produces a bogus 1970-ish date, and
// comparing it as a string elsewhere can throw when it turns out to be a
// number at runtime despite its `string` type. Try parsing it as an ordinary
// date first; only fall back to the epoch offset when that is implausible.
function normalizeVisitTime(raw: string | number): Date {
  const asDate = new Date(raw);
  if (!Number.isNaN(asDate.getTime()) && asDate.getFullYear() > 1990) {
    return asDate;
  }

  const numeric = typeof raw === "number" ? raw : Number(raw);
  if (Number.isFinite(numeric)) {
    return new Date((numeric + CORE_DATA_EPOCH_OFFSET_SECONDS) * 1000);
  }

  return new Date(0);
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type RawHistoryRow = Omit<HistoryItem, "lastVisitTime" | "lastVisitDate"> & { lastVisitTime: string | number };

/** Escape a user term for safe interpolation into a SQLite LIKE pattern (with ESCAPE '\\'). */
const escapeLikeTerm = (term: string) =>
  term
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/[%_]/g, (char) => `\\${char}`);

const likeClause = (column: string, escaped: string) => `${column} LIKE '%${escaped}%' ESCAPE '\\'`;

const getHistoryQuery = (searchText?: string) => {
  const whereClause = searchText
    ? splitSearchTerms(searchText)
        .map((term) => {
          const escaped = escapeLikeTerm(term);
          return `(${likeClause("URL", escaped)} OR ${likeClause("TITLE", escaped)})`;
        })
        .join(" AND ")
    : undefined;
  return `
      SELECT ID as id,
             TITLE as title,
             URL as url,
             LAST_VISIT_TIME as lastVisitTime,
             COALESCE(VISIT_COUNT, 0) as visitCount
      FROM history_items
      ${whereClause ? `WHERE ${whereClause}` : ""}
      ORDER BY LAST_VISIT_TIME DESC
      LIMIT ${LIMIT}
  `;
};

const useHistorySearch = (selectedProfileId: string, searchText?: string) => {
  const historyPath = getHistoryPath(selectedProfileId);
  const queryKey = `${selectedProfileId}\u0000${searchText ?? ""}`;
  const executingQueryKey = useRef(queryKey);
  const [completedQueryKey, setCompletedQueryKey] = useState<string>();

  const result = useSQL<RawHistoryRow>(historyPath, getHistoryQuery(searchText), {
    // `useSQL` deliberately keeps its previous result while a new query starts.
    // Expose the completed query identity so callers can distinguish stale data
    // from the result set for the text currently in the search bar.
    onWillExecute: () => {
      executingQueryKey.current = queryKey;
    },
    onData: () => {
      setCompletedQueryKey(executingQueryKey.current);
    },
  });

  // `DATE(LAST_VISIT_TIME)` used to compute `lastVisitDate` in SQL, but that
  // is wrong whenever the column holds a raw epoch number rather than a date
  // string (SQLite then reads it as a Julian day, not a Unix timestamp).
  // Derive both fields here instead, from the same normalized instant.
  const data = useMemo(
    () =>
      result.data?.map((row) => {
        const visitedAt = normalizeVisitTime(row.lastVisitTime);
        return { ...row, lastVisitTime: visitedAt.toISOString(), lastVisitDate: toLocalDateKey(visitedAt) };
      }),
    [result.data],
  );

  return { ...result, data, queryKey, completedQueryKey };
};

export default useHistorySearch;
