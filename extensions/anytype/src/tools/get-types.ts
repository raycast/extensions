import { getTypes } from "../api";
import { apiLimitMax } from "../utils";

type Input = {
  /**
   * The unique identifier of the space to get types from.
   * This value can be obtained from the `getSpaces` tool.
   */
  spaceId: string;
};

/**
 * Retrieve a list of all types in a space.
 * This function queries the specified space and returns a list of types that are available in the space.
 * Should always be called when user requests objects of a specific type to retrieve type_key.
 */
export default async function tool({ spaceId }: Input) {
  const allTypes = [];
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const { types, pagination } = await getTypes(spaceId, { offset, limit: apiLimitMax });
    allTypes.push(...types);
    hasMore = pagination.has_more;
    offset += apiLimitMax;
  }

  const results = allTypes.map(({ object, name, id, key: type_key, recommended_layout }) => ({
    object,
    name,
    id,
    type_key,
    recommended_layout,
  }));

  return {
    results,
    total: allTypes.length,
  };
}
