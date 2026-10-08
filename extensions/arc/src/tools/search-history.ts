import { getHistory } from "../history";

type Input = {
  /**
   * The search text to filter the history entries.
   */
  searchText?: string;
  /**
   * The maximum number of history entries to return.
   *
   * @default 50
   */
  searchLimit?: number;
};

const tool = async (input: Input) => {
  return await getHistory(input.searchText, input.searchLimit ?? 50);
};

export default tool;
