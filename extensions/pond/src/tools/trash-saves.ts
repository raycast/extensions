import { Action, type Tool } from "@raycast/api";
import { pond } from "../api/client";
import { describeSaves } from "../api/tools";

type Input = {
  /** Save IDs from Search Saves, all from the same library. Only saves the user asked to remove. */
  ids: string[];
  /** Library ID returned with the saves. */
  libraryId: string;
};

export default async function tool(input: Input) {
  return pond().trash(input.ids, input.libraryId);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  style: Action.Style.Destructive,
  message: "These saves move to the Trash. You can restore them in Pond.",
  info: [{ name: "Saves", value: await describeSaves(input.ids, input.libraryId) }],
});
