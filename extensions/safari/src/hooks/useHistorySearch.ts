import { useSQL } from "@raycast/utils";
import _ from "lodash";
import { homedir } from "os";
import { resolve } from "path";
import { HistoryItem } from "../types";
import { safariAppIdentifier } from "../utils";

export const HISTORY_DB = `${resolve(homedir(), `Library/${safariAppIdentifier.replace(/ /g, "")}/`)}/History.db`;
const LIMIT = 100;

export const getHistoryQuery = (searchText?: string) => {
  const whereClause = searchText
    ? _.chain(searchText)
        .split(" ")
        .filter((word) => word.length > 0)
        .map((term) => `(url LIKE "%${term}%" OR title LIKE "%${term}%")`)
        .join(" AND ")
        .value()
    : undefined;
  return `
  SELECT history_items.id, title, url, datetime(visit_time+978307200, "unixepoch", "localtime") as lastVisited
  FROM history_items
    INNER JOIN history_visits
    ON history_visits.history_item = history_items.id
  ${whereClause ? `WHERE ${whereClause}` : ""}
  GROUP BY url
  ORDER BY visit_time DESC
  LIMIT ${LIMIT}
  `;
};

const useHistorySearch = (searchText?: string) => {
  const query = getHistoryQuery(searchText);
  return useSQL<HistoryItem>(HISTORY_DB, query);
};

export default useHistorySearch;
