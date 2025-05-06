import { SingleNote } from "@hackmd/api/dist/type";
import api from "../lib/api";

type ViewNoteArgs = {
  /**
   * ID of the note to view
   * Can be either the full note ID or the shortId
   */
  noteId: string;
};

/**
 * Get detailed content and metadata for a specific note by ID
 * Accepts both full note IDs and shortIds
 */
export default async function tool(args: ViewNoteArgs): Promise<SingleNote> {
  const { noteId } = args;
  return api.getNote(noteId);
}
