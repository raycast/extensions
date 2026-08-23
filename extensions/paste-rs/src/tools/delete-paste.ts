import { Action, Tool } from "@raycast/api";
import { deletePaste, getPasteId } from "../api";
import { getHistory, removeFromHistory } from "../history";

type Input = {
  /**
   * The paste.rs URL or bare paste ID to delete, e.g. "https://paste.rs/AbC" or "AbC".
   */
  url: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    style: Action.Style.Destructive,
    message: `Permanently delete the paste "${getPasteId(input.url)}" from paste.rs? This cannot be undone.`,
  };
};

/**
 * Permanently delete a paste from paste.rs by its URL or ID, and remove it from the user's local Raycast
 * history. This is irreversible: once deleted, the paste's link will no longer work. Always call this tool
 * to perform the deletion yourself — never claim the paste is already gone or unavailable without calling
 * it first. Do not use a browser or web fetch to check whether the URL loads before deciding what to do:
 * this tool already handles a paste that's missing or already deleted by treating it as successfully
 * deleted. Calling this tool triggers a confirmation dialog for the user, so call it directly instead of
 * asking for confirmation in your reply.
 */
export default async function tool(input: Input) {
  await deletePaste(input.url);

  const id = getPasteId(input.url);
  const history = await getHistory();
  const match = history.find((record) => getPasteId(record.url) === id);

  if (match) {
    await removeFromHistory(match.id);
  }

  return { deleted: true, id };
}
