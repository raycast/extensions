import { Action, Tool } from "@raycast/api";
import api from "../lib/api";

type DeleteNoteArgs = {
  /**
   * ID of the note to delete
   * Can be either the full note ID or the shortId
   */
  noteId: string;
  /**
   * Optional team path if it's a team note
   */
  teamPath?: string;
};

export const confirmation: Tool.Confirmation<DeleteNoteArgs> = async (input) => {
  const location = input.teamPath ? `team "${input.teamPath}" workspace` : "personal workspace";

  return {
    style: Action.Style.Destructive,
    message: `Delete note (ID: ${input.noteId}) from ${location}? This action cannot be undone. The note will be permanently removed.`,
  };
};

/**
 * Delete an existing note from HackMD, either from personal workspace or team workspace
 * Accepts note IDs in both full ID and shortId format
 */
export default async function tool(args: DeleteNoteArgs): Promise<{ success: boolean; message: string }> {
  const { noteId, teamPath } = args;

  try {
    // If teamPath is provided, delete a team note, otherwise delete a personal note
    if (teamPath) {
      await api.deleteTeamNote(teamPath, noteId);
    } else {
      await api.deleteNote(noteId);
    }

    return {
      success: true,
      message: `Successfully deleted note (ID: ${noteId})${teamPath ? ` from team ${teamPath}` : ""}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to delete note: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
