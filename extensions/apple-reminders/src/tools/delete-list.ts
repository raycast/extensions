import { Action, Tool } from "@raycast/api";
import { deleteList } from "swift:../../swift/AppleReminders";

type Input = {
  /**
   * The ID of the list to delete. REQUIRED parameter. Warning: This will also delete all reminders in this list.
   */
  listId: string;

  /** The list properties to display to the user */
  confirmation: {
    title: string;
    color?: string;
    reminderCount?: number;
  };
};

export default async function (input: Input) {
  // Validate that listId is provided
  if (!input || !input.listId || typeof input.listId !== "string" || input.listId.trim() === "") {
    throw new Error(
      "The 'listId' parameter is required and must be a non-empty string. Please provide the ID of the list to delete.",
    );
  }

  await deleteList(input.listId);
  return { listId: input.listId };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { title, reminderCount } = input.confirmation;

  const info = [{ name: "List Name", value: title }];

  if (reminderCount !== undefined) {
    info.push({
      name: "Reminders",
      value: `${reminderCount} reminder${reminderCount !== 1 ? "s" : ""} will be deleted`,
    });
  }

  return {
    style: Action.Style.Destructive,
    info,
    message: reminderCount && reminderCount > 0 ? "All reminders in this list will also be deleted." : undefined,
  };
};
