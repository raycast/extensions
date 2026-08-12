import { Action, Tool } from "@raycast/api";
import { deleteObject } from "../api";
import { describeObject, runWrite } from "./shared";

type Input = {
  /**
   * The id of the object to delete. Get this from the search-mymind tool.
   */
  id: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    style: Action.Style.Destructive,
    message: "Delete this item? It will be moved to Recently Deleted in mymind.",
    info: [{ name: "Item", value: await describeObject(input.id) }],
  };
};

/**
 * Delete an object from the user's mymind library. This moves the item to
 * Recently Deleted. Requires a full-access key.
 */
export default async function tool(input: Input): Promise<{ success: true; id: string }> {
  return await runWrite(async () => {
    await deleteObject(input.id);
    return { success: true, id: input.id };
  });
}
