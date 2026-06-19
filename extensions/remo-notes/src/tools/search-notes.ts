import { remoApi } from "../utils/api";
import { stripHtml } from "../utils/stripHtml";

type Input = {
  /**
   * The search query. Can be keywords or a natural-language description of what to find.
   */
  query: string;
};

/**
 * Search the user's Remo notes by keyword or semantic meaning and return the matching notes.
 */
export default async function tool(input: Input) {
  const notes = await remoApi.searchNotes(input.query);

  return notes.slice(0, 20).map((note) => ({
    id: note._id,
    title: note.title || "Untitled",
    isLocked: note.isLocked ?? false,
    updatedAt: new Date(note.updatedAt).toISOString(),
    snippet: note.summary || stripHtml(note.content || "").slice(0, 200),
  }));
}
