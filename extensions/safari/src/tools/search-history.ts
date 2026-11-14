import { executeSQL } from "@raycast/utils";
import { getHistoryQuery, HISTORY_DB } from "../hooks/useHistorySearch";
import { HistoryItem } from "../types";
import { getSearchLimit, limitResults, withFullDiskAccess } from "../utils";

type Input = {
  /**
   * Words to search for in page titles and URLs. Every word must match.
   *
   * @remarks
   * Omit it to return the most recently visited pages.
   */
  searchText?: string;

  /**
   * The maximum number of entries to return.
   *
   * @default 50
   * @remarks
   * Capped at 100.
   */
  searchLimit?: number;
};

/**
 * Searches the Safari browsing history, most recent visits first.
 * `truncated` is true when more entries match than were returned.
 */
export default async function tool(input: Input) {
  const limit = getSearchLimit(input.searchLimit);

  // Fetch one extra row to know whether more entries match
  const items = await withFullDiskAccess("history", () =>
    executeSQL<HistoryItem>(HISTORY_DB, getHistoryQuery(input.searchText?.trim(), limit + 1)),
  );

  return limitResults(items, limit);
}
