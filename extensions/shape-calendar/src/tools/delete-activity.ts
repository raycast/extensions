import { Action, Tool } from "@raycast/api";
import { deleteActivity } from "../api/client";

type Input = {
  /**
   * The ID of the activity to delete
   */
  id: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    style: Action.Style.Destructive,
    message: `Are you sure you want to delete this activity (${input.id})?`,
  };
};

export default async function (input: Input) {
  await deleteActivity(input.id);
  return { deleted: true };
}
