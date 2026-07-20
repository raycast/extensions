import { getHistoryPath, splitSearchTerms } from "src/utils";
import { HistoryItem } from "../types";
import { useSQL } from "@raycast/utils";

const LIMIT = 100;

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
      SELECT DISTINCT history_items.ID as id,
                      TITLE            as title,
                      URL              as url,
                      LAST_VISIT_TIME  as lastVisitTime, DATE (LAST_VISIT_TIME) as lastVisitDate
      FROM history_items
          INNER JOIN visits
      ON visits.HISTORY_ITEM_ID = history_items.ID
          ${whereClause ? `WHERE ${whereClause}` : ""}
      ORDER BY LAST_VISIT_TIME DESC
          LIMIT ${LIMIT}
  `;
};

const useHistorySearch = (selectedProfileId: string, searchText?: string) => {
  const historyPath = getHistoryPath(selectedProfileId);

  const query = getHistoryQuery(searchText);
  return useSQL<HistoryItem>(historyPath, query);
};

export default useHistorySearch;
