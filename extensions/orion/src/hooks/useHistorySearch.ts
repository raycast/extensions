import { homedir } from "os";
import { join } from "path";
import { HistoryItem } from "../types";
import { useSQL } from "@raycast/utils";

const HISTORY_DB = join(homedir(), "/Library/Application Support/Orion/Defaults/history");
const LIMIT = 100;

const getHistoryQuery = (searchText?: string) => {
  const whereClause = searchText
    ? searchText
        .split(" ")
        .filter((word) => word.length > 0)
        .map((term) => `(URL LIKE '%${term}%' OR TITLE LIKE '%${term}%')`)
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

const useHistorySearch = (searchText?: string) => {
  const query = getHistoryQuery(searchText);
  return useSQL<HistoryItem>(HISTORY_DB, query);
};

export default useHistorySearch;
