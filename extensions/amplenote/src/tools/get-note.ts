import { displayMarkdown } from "../lib/api";
import { amplenote } from "../lib/amplenote";
import { isConnectionError } from "../lib/mcp";
import { compactNote, describeError } from "./shared";

type Input = {
  /**
   * The noteUUID from search-notes or search-tasks. Never invent an id.
   */
  noteUUID: string;
  /**
   * Also return the notes that link to this note (backlinks), up to 50, plus backlinkCount. Defaults to false.
   */
  includeBacklinks?: boolean;
};

const MAX_BACKLINKS = 50;

async function loadBacklinks(noteUUID: string) {
  try {
    const notes = await amplenote.getNoteBacklinks(noteUUID);
    return { backlinkCount: notes.length, backlinks: notes.slice(0, MAX_BACKLINKS).map(compactNote) };
  } catch (error) {
    if (isConnectionError(error)) throw error;
    // Say so instead of returning an empty list, which would read as "nothing links here".
    return { backlinkCount: null, backlinks: null, backlinksError: "Could not load backlinks for this note." };
  }
}

/**
 * Read the full Markdown content of an Amplenote note, optionally with the notes that link to it. Very long notes are shortened.
 */
export default async function (input: Input) {
  try {
    const notFound = (error: unknown) => {
      if (isConnectionError(error)) throw error;
      return null;
    };
    const [metadata, markdown, backlinks] = await Promise.all([
      amplenote.getNoteMetadata(input.noteUUID).catch(notFound),
      amplenote.getNoteContent(input.noteUUID).catch(notFound),
      input.includeBacklinks ? loadBacklinks(input.noteUUID) : undefined,
    ]);
    if (!metadata) {
      throw new Error(`No note with id "${input.noteUUID}". Use search-notes to find note ids.`);
    }
    return {
      ...compactNote(metadata),
      content: displayMarkdown(markdown ?? "", { headingOffset: 0, limit: 30_000 }),
      ...backlinks,
    };
  } catch (error) {
    describeError(error);
  }
}
