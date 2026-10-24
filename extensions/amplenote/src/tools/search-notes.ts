import { amplenote } from "../lib/amplenote";
import { hasTag } from "../lib/tags";
import { compactNote, describeError } from "./shared";

type Input = {
  /**
   * Optional text to search for in note titles and full note content. Omit it to list recently opened notes.
   */
  query?: string;
  /**
   * Optional tag to filter by, such as "work" or "projects/homelab". Child tags are included. Use list-tags to see available tags.
   */
  tag?: string;
  /**
   * Include archived notes. Defaults to false. Old Daily Jots are usually archived.
   */
  includeArchived?: boolean;
  /**
   * Maximum notes to return. Defaults to 20, maximum 50.
   */
  limit?: number;
};

/**
 * Search Amplenote notes by title and content, or list recently opened notes.
 * Returns note ids, names, and tags, not note content. Call get-note to read a note.
 */
export default async function (input: Input = {}) {
  try {
    const query = input.query?.trim();
    const notes = query ? await amplenote.searchNotes(query) : await amplenote.listNotes("opened");
    const matches = notes
      .filter((note) => input.includeArchived || !note.archived)
      .filter((note) => !input.tag || hasTag(note.tags, input.tag.trim().toLowerCase()));
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
    return { total: matches.length, notes: matches.slice(0, limit).map(compactNote) };
  } catch (error) {
    describeError(error);
  }
}
