import { displayMarkdown } from "../lib/api";
import { amplenote } from "../lib/amplenote";
import { isConnectionError } from "../lib/mcp";
import { compactNote, describeError } from "./shared";

type Input = {
  /**
   * The noteUUID from search-notes or search-tasks. Never invent an id.
   */
  noteUUID: string;
};

/**
 * Read the full Markdown content of an Amplenote note. Very long notes are shortened.
 */
export default async function (input: Input) {
  try {
    const notFound = (error: unknown) => {
      if (isConnectionError(error)) throw error;
      return null;
    };
    const [metadata, markdown] = await Promise.all([
      amplenote.getNoteMetadata(input.noteUUID).catch(notFound),
      amplenote.getNoteContent(input.noteUUID).catch(notFound),
    ]);
    if (!metadata) {
      throw new Error(`No note with id "${input.noteUUID}". Use search-notes to find note ids.`);
    }
    return { ...compactNote(metadata), content: displayMarkdown(markdown ?? "", { headingOffset: 0, limit: 30_000 }) };
  } catch (error) {
    describeError(error);
  }
}
