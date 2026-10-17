import { Tool } from "@raycast/api";
import { pinObjectToTopOfMind } from "../api";
import { describeObject, runWrite } from "./shared";

type Input = {
  /**
   * The id of the object to pin to Top of Mind. Get this from the search-mymind
   * tool.
   */
  id: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Pin this item to Top of Mind?",
    info: [{ name: "Item", value: await describeObject(input.id) }],
  };
};

/**
 * Pin an object to the top of the user's mymind (Top of Mind). Requires a
 * full-access key.
 */
export default async function tool(input: Input): Promise<{ success: true; id: string }> {
  return await runWrite(async () => {
    await pinObjectToTopOfMind(input.id);
    return { success: true, id: input.id };
  });
}
