import { SingleNote } from "@hackmd/api/dist/type";
import { Tool } from "@raycast/api";
import api from "../lib/api";

type CreateNoteArgs = {
  /**
   * The content of the note in Markdown format
   */
  content: string;
  /**
   * Optional team path to create note in a team workspace
   */
  teamPath?: string;
  /**
   * Read permission level (defaults to "guest")
   */
  readPermission?: SingleNote["readPermission"];
  /**
   * Write permission level (defaults to "signed_in")
   */
  writePermission?: SingleNote["writePermission"];
};

export const confirmation: Tool.Confirmation<CreateNoteArgs> = async (input) => {
  const notePreview = input.content.split("\n")[0].substring(0, 40);
  const location = input.teamPath ? `team "${input.teamPath}" workspace` : "personal workspace";

  return {
    message: `Create a new note in ${location}?`,
    info: [{ name: "Note preview", value: `${notePreview}${notePreview.length >= 40 ? "..." : ""}` }],
  };
};

/**
 * Create a new note in HackMD, either in personal workspace or team workspace
 */
export default async function tool(args: CreateNoteArgs): Promise<SingleNote> {
  const { teamPath, ...noteData } = args;

  // If teamPath is provided, create a team note, otherwise create a personal note
  if (teamPath) {
    return api.createTeamNote(teamPath, noteData);
  } else {
    return api.createNote(noteData);
  }
}
