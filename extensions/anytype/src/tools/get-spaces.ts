import { getSpaces } from "../api";
import { apiLimitMax } from "../utils";

/**
 * Retrieve a list of spaces from the API.
 * This function queries all available spaces and returns a list of spaces.
 */
export default async function tool() {
  const allSpaces = [];
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const { spaces, pagination } = await getSpaces({ offset, limit: apiLimitMax });
    allSpaces.push(...spaces);
    hasMore = pagination.has_more;
    offset += apiLimitMax;
  }

  const results = allSpaces.map(({ object, name, id }) => ({ object, name, id }));

  return {
    results,
    total: allSpaces.length,
  };
}
