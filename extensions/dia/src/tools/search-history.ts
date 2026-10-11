import { searchHistory } from "../dia";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

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
  limit?: number;
};

/**
 * Searches the Dia browsing history of the active profile, most recent visits first.
 */
export default async function tool(input: Input) {
  const limit = Math.min(Math.max(Math.floor(input.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
  return await searchHistory(input.searchText?.trim(), limit);
}
