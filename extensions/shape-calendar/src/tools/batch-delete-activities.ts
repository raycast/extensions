import { Action, Tool } from "@raycast/api";
import { batchDeleteActivities } from "../api/client";

type Input = {
  /**
   * Array of activity IDs to delete (max 100)
   */
  ids: string[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    style: Action.Style.Destructive,
    message: `Are you sure you want to delete ${input.ids.length} activities?`,
  };
};

export default async function (input: Input) {
  const result = await batchDeleteActivities(input.ids);
  return result;
}
