import { Action, Tool } from "@raycast/api";
import { getOwnList } from "./list-api";
import { assertListId } from "./list-matching";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Trakt ID or slug of the list to delete. Get it from `get-lists`.
   */
  listId: string;
};

type Output = {
  success: boolean;
  message: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const list = await getOwnList(input.listId);

  return {
    style: Action.Style.Destructive,
    message: `Delete the Trakt list "${list.name}" and all ${list.item_count ?? 0} item(s) on it? This cannot be undone.`,
    info: [
      { name: "List", value: list.name },
      { name: "Items", value: String(list.item_count ?? 0) },
      { name: "Privacy", value: list.privacy ?? "private" },
    ],
  };
};

/**
 * Permanently delete one of your Trakt personal lists and every item on it.
 * A destructive confirmation dialog names the list before anything is deleted.
 * Only use this when the user explicitly asks to delete the whole list; to take titles out,
 * use `remove-from-list`.
 */
export default async function tool(input: Input): Promise<Output> {
  const listId = assertListId(input.listId);
  const list = await getOwnList(listId);

  const res = await executeToolCall(
    (signal) =>
      toolTraktClient.users.deleteList({
        params: { id: "me", listId },
        fetchOptions: { signal },
      }),
    `Failed to delete the list "${list.name}"`,
  );

  if (res.status !== 204) {
    throw new Error(`Trakt answered HTTP ${res.status} instead of confirming the deletion of "${list.name}".`);
  }

  return {
    success: true,
    message: `Deleted the list "${list.name}" and its ${list.item_count ?? 0} item(s).`,
  };
}
