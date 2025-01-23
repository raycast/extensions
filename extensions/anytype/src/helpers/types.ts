import { Type, Space } from "./schemas";
import { apiLimit } from "./constants";
import { getTypes } from "../api/getTypes";

/**
 * Fetches all `Type`s from a single space, doing pagination if necessary.
 */
export async function fetchAllTypesForSpace(spaceId: string): Promise<Type[]> {
  let allTypes: Type[] = [];
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    try {
      const response = await getTypes(spaceId, { offset, limit: apiLimit });
      allTypes = [...allTypes, ...response.types];
      hasMore = response.pagination.has_more;
      offset += apiLimit;
    } catch (err) {
      console.error(`Error fetching types for space ${spaceId} at offset ${offset}:`, err);
      break;
    }
  }

  return allTypes;
}

/**
 * Aggregates all `Type`s from all given spaces.
 */
export async function getAllTypesFromSpaces(spaces: Space[]): Promise<Type[]> {
  const allTypes: Type[] = [];
  for (const space of spaces) {
    try {
      const types = await fetchAllTypesForSpace(space.id);
      allTypes.push(...types);
    } catch (err) {
      console.error(`Error fetching types for space ${space.id}:`, err);
    }
  }
  return allTypes;
}
