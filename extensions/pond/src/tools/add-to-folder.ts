import type { Tool } from "@raycast/api";
import { pond } from "../api/client";
import { describeSaves } from "../api/tools";
import { folderPaths } from "../lib/display";

type Input = {
  /** Save IDs from Search Saves, all from the same library. */
  ids: string[];
  /** Library ID returned with the saves. */
  libraryId: string;
  /** Folder ID from List Folders. */
  folderId: string;
  /** Set true to take the saves out of the folder instead. */
  remove?: boolean;
};

export default async function tool(input: Input) {
  return pond().editFolders({
    ids: input.ids,
    libraryId: input.libraryId,
    add: input.remove ? [] : [input.folderId],
    remove: input.remove ? [input.folderId] : [],
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const folder = folderPaths(await pond().folders()).find((item) => item.id === input.folderId);
  return {
    info: [
      { name: "Saves", value: await describeSaves(input.ids, input.libraryId) },
      { name: input.remove ? "Remove from Folder" : "Add to Folder", value: folder?.path ?? input.folderId },
    ],
  };
};
