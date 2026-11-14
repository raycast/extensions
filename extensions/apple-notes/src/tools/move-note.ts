import { Tool } from "@raycast/api";

import { moveNoteToFolder } from "../api/applescript";
import { resolveAppleNoteId } from "../helpers";

type Input = {
  /** The note identifier. Use the "id" value from search-notes when possible. */
  noteId: string;
  /** The name of the destination folder. Use list-folders to find a valid folder name. */
  folderName: string;
  /**
   * The name of the account that owns the destination folder.
   * Required whenever list-folders shows more than one account with a folder of this name.
   */
  accountName?: string;
};

export default async function (input: Input) {
  const noteId = await resolveAppleNoteId(input.noteId);
  return moveNoteToFolder(noteId, input.folderName, input.accountName);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    info: [
      { name: "Destination folder", value: input.folderName },
      ...(input.accountName ? [{ name: "Destination account", value: input.accountName }] : []),
    ],
  };
};
