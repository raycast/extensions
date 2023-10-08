import { getHistoryPath } from "src/utils";
import { HistoryItem } from "../types";
import { useSQL } from "@raycast/utils";

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

const useHistorySearch = (selectedProfileId: string, searchText?: string) => {
  const historyPath = getHistoryPath(selectedProfileId);

  const query = getHistoryQuery(searchText);
  return useSQL<HistoryItem>(historyPath, query);
};

export default useHistorySearch;
