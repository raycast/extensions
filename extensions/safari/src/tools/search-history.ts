import { executeSQL } from "@raycast/utils";
import { getHistoryQuery, HISTORY_DB } from "../hooks/useHistorySearch";
import { HistoryItem } from "../types";

type Input = {
  /**
   * The text to search for in the history.
   */
  searchText: string;
};

const tool = async (input: Input) => {
  const query = getHistoryQuery(input.searchText);
  return executeSQL<HistoryItem>(HISTORY_DB, query);
};

export default tool;
