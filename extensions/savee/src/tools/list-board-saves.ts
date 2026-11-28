import { listBoardSaves } from "../api";
import { getErrorMessage } from "../errors";
import { formatSaveForAI, matchesQuery } from "../save-utils";
import { Save } from "../types";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const MAX_PAGES = 5;

type Input = {
  /** The board id or short id, from list-boards */
  boardId: string;
  /** Optional words to filter by title, source, colors or visual description */
  query?: string;
  /** How many saves to return, 1 to 100. Defaults to 30 */
  limit?: number;
};

/** Lists the saves on one Savee board, newest first. */
export default async function tool(input: Input) {
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const results: Save[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  try {
    for (let page = 0; page < MAX_PAGES && hasMore && results.length < limit; page += 1) {
      const response = await listBoardSaves(input.boardId, cursor);
      results.push(...response.data.filter((save) => matchesQuery(save, input.query)));
      cursor = response.next_cursor ?? undefined;
      hasMore = response.has_more && Boolean(cursor);
    }
  } catch (error) {
    return { error: getErrorMessage(error) };
  }

  return { results: results.slice(0, limit).map(formatSaveForAI), hasMore };
}
