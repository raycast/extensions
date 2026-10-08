import { addObjectsToList } from "../api";
import { AddObjectsToListRequest } from "../models";

type Input = {
  /**
   * The unique identifier of the space to add the object to.
   * This value can be obtained from the `getSpaces` tool.
   * */
  spaceId: string;

  /**
   * The unique identifier of the list to add the object to.
   * This value can be obtained from the `search-anytype` or `search-space` tools by searching for type of 'collection'.
   */
  listId: string;

  /**
   * The unique identifier of the object to add to the list.
   * This value can be obtained from the `search-anytype`, `search-space` or `create-object` tools.
   */
  objectId: string;
};

/**
 * Add an object to a list.
 * This function adds the specified object to the specified list.
 */
export default async function tool({ spaceId, listId, objectId }: Input) {
  const request: AddObjectsToListRequest = { objects: [objectId] };
  return await addObjectsToList(spaceId, listId, request);
}
