import { Tool } from "@raycast/api";
import { addObjectToSpaces, getObject, listSpaces, removeObjectFromSpace } from "../api";
import { ObjectSummary, describeObject, runWrite, summarizeObject } from "./shared";

type Input = {
  /**
   * The id of the object to move. Get this from the search-mymind tool.
   */
  id: string;
  /**
   * The id of the destination space. Resolve names to ids with the list-spaces
   * tool. Leave empty to remove the item from all spaces.
   */
  spaceId?: string;
};

async function resolveSpaceName(spaceId?: string): Promise<string> {
  if (!spaceId) {
    return "No space";
  }

  try {
    const spaces = await listSpaces();
    return spaces.find((space) => space.id === spaceId)?.name ?? spaceId;
  } catch {
    return spaceId;
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Move this item to a different space?",
    info: [
      { name: "Item", value: await describeObject(input.id) },
      { name: "Destination", value: await resolveSpaceName(input.spaceId?.trim() || undefined) },
    ],
  };
};

/**
 * Move an object into a single space, replacing any spaces it currently belongs
 * to. Pass an empty spaceId to remove the object from all spaces. Requires a
 * full-access key.
 */
export default async function tool(input: Input): Promise<ObjectSummary> {
  const nextSpaceId = input.spaceId?.trim() || undefined;

  return await runWrite(async () => {
    const object = await getObject(input.id);
    const currentSpaceIds = object.spaces?.map((space) => space.id) ?? [];

    if (nextSpaceId && !currentSpaceIds.includes(nextSpaceId)) {
      await addObjectToSpaces(input.id, [nextSpaceId]);
    }

    const spaceIdsToRemove = currentSpaceIds.filter((spaceId) => spaceId !== nextSpaceId);
    await Promise.all(spaceIdsToRemove.map((spaceId) => removeObjectFromSpace(spaceId, input.id)));

    return summarizeObject(await getObject(input.id), { includeContent: true });
  });
}
