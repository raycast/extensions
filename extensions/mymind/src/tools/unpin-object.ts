import { Tool } from "@raycast/api";
import { unpinObjectFromTopOfMind } from "../api";
import { describeObject, runWrite } from "./shared";

type Input = {
  /**
   * The id of the object to remove from Top of Mind. Get this from the
   * search-mymind tool.
   */
  id: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Remove this item from Top of Mind?",
    info: [{ name: "Item", value: await describeObject(input.id) }],
  };
};

/**
 * Remove an object from Top of Mind. Requires a full-access key.
 */
export default async function tool(input: Input): Promise<{ success: true; id: string }> {
  return await runWrite(async () => {
    await unpinObjectFromTopOfMind(input.id);
    return { success: true, id: input.id };
  });
}
