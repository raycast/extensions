import { getWalkHistory } from "../walk-history";

type Input = {
  /** Maximum number of recent walks to return, from 1 to 100. Defaults to 10. */
  limit?: number;
};

/** Gets websites discovered during previous walks, newest first. */
export default async function getHistory(input: Input) {
  const requestedLimit = input.limit ?? 10;
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
    throw new Error("Limit must be an integer from 1 to 100");
  }

  const history = await getWalkHistory();
  return {
    walks: history.slice(0, requestedLimit),
    returnedCount: Math.min(history.length, requestedLimit),
    totalCount: history.length,
  };
}
