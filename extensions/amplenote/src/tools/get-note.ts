import { amplenote } from "../lib/amplenote";
import { isConnectionError } from "../lib/mcp";
import { compactNote, describeError, nullIfNotFound } from "./shared";

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
const MAX_CONTENT = 30_000;

function shortenMarkdown(markdown: string): string {
  if (markdown.length <= MAX_CONTENT) return markdown;
  return `${markdown.slice(0, MAX_CONTENT)}\n\n_Note shortened. Open it in Amplenote to read all of it._`;
}

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
    const [metadata, markdown, backlinks] = await Promise.all([
      amplenote.getNoteMetadata(input.noteUUID).catch(nullIfNotFound),
      amplenote.getNoteContent(input.noteUUID).catch((error) => {
        if (isConnectionError(error)) throw error;
        return undefined;
      }),
      input.includeBacklinks ? loadBacklinks(input.noteUUID) : undefined,
    ]);
    if (!metadata) {
      throw new Error(`No note with id "${input.noteUUID}". Use search-notes to find note ids.`);
    }
    // Raw Markdown so footnotes and link targets survive. A failed load or a locked Vault note is reported
    // as such, never as an empty note.
    const content = metadata.vault
      ? { content: null, contentError: "This is a locked Vault note. Open it in Amplenote to read it." }
      : markdown === undefined || markdown === null
        ? { content: null, contentError: "Could not load this note's content." }
        : { content: shortenMarkdown(markdown) };
    return {
      ...compactNote(metadata),
      ...content,
      ...backlinks,
    };
  } catch (error) {
    describeError(error);
  }
}
