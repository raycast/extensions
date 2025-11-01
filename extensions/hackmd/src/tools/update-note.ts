import { SingleNote } from "@hackmd/api/dist/type";
import { AxiosResponse } from "axios";
import { Action, Tool } from "@raycast/api";
import api from "../lib/api";

type UpdateNoteArgs = {
  /**
   * ID of the note to update
   * Can be either the full note ID or the shortId
   */
  noteId: string;
  /**
   * The updated content of the note in Markdown format
   */
  content: string;
  /**
   * Optional team path if it's a team note
   */
  teamPath?: string;
  /**
   * Updated read permission level
   */
  readPermission?: SingleNote["readPermission"];
  /**
   * Updated write permission level
   */
  writePermission?: SingleNote["writePermission"];
};

export const confirmation: Tool.Confirmation<UpdateNoteArgs> = async (input) => {
  const notePreview = input.content.split("\n")[0].substring(0, 40);
  const location = input.teamPath ? `team "${input.teamPath}" workspace` : "personal workspace";

  return {
    message: `Update note (ID: ${input.noteId}) in ${location}?`,
    style: Action.Style.Regular,
    info: [
      {
        name: "Content Preview",
        value: `${notePreview}${notePreview.length >= 40 ? "..." : ""}`,
      },
    ],
  };
};

/**
 * Update an existing note in HackMD, either in personal workspace or team workspace
 * Accepts note IDs in both full ID and shortId format
 */
export default async function tool(args: UpdateNoteArgs): Promise<AxiosResponse> {
  const { noteId, teamPath, ...updateData } = args;

  // If teamPath is provided, update a team note, otherwise update a personal note
  if (teamPath) {
    return api.updateTeamNote(teamPath, noteId, updateData);
  } else {
    // workaround for type mismatch
    return api.updateNote(noteId, updateData) as unknown as AxiosResponse;
  }
}
