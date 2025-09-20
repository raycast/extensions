import { getObjectsInList } from "../api";
import { apiLimitMax } from "../utils";

type Input = {
  /**
   * The unique identifier of the space to get items from.
   * This value can be obtained from the `getSpaces` tool.
   */
  spaceId: string;

  /**
   * The unique identifier of the list to get items from.
   * This value can be obtained from the `search-space`or `search-anytype` tool and specifying types as 'collection'.
   */
  listId: string;
};

/**
 * Get all items in a list.
 * This function queries all available items in a list and returns a list of objects.
 */
export default async function tool({ spaceId, listId }: Input) {
  const allItems = [];
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    // TODO: replace viewId with the actual viewId at some point
    const { objects, pagination } = await getObjectsInList(spaceId, listId, "", { offset, limit: apiLimitMax });
    allItems.push(...objects);
    hasMore = pagination.has_more;
    offset += apiLimitMax;
  }

  const results = allItems.map(({ object, name, id, type, snippet }) => ({
    object,
    name,
    id,
    type: {
      name: type.name,
      id: type.id,
      type_key: type.key,
    },
    snippet,
  }));

  return {
    results,
    total: allItems.length,
  };
}
