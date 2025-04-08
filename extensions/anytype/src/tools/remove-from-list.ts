import { removeObjectsFromList } from "../api";

type Input = {
  /**
   * The unique identifier of the space to remove the object from.
   * This value can be obtained from the `getSpaces` tool.
   */
  spaceId: string;

  /**
   * The unique identifier of the list to remove the object from.
   * This value can be obtained from the `search-space` or `search-anytype` tools by searching for type of `ot-collection`.
   */
  listId: string;

  /**
   * The unique identifiers of the objects to remove from the list.
   * Those values can be obtained from the `search-anytype`, `search-space`, `create-object`, `get-list-items` tools.
   */
  objectIds: string[];
};

/**
 * Remove objects from a list.
 * This function removes the specified objects from the specified list.
 */
export default async function tool({ spaceId, listId, objectIds }: Input) {
  return removeObjectsFromList(spaceId, listId, objectIds);
}
