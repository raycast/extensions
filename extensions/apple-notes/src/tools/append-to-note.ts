import { appendNoteBody } from "../api/applescript";
import { resolveAppleNoteId } from "../helpers";

type Input = {
  /** The note identifier. Use the "id" value from search-notes when possible. */
  noteId: string;
  /**
   * The content to append to the note, formatted as HTML, so that it can be pasted into Apple Notes.
   *
   * - Don't repeat the existing content of the note, only provide the new content to add.
   * - Use the same language as the existing note.
   * - Break the content into paragraphs with line breaks.
   * - Don't use Markdown links (e.g. [Link](https://example.com)), use HTML links (e.g. <a href="https://example.com">Link</a>).
   */
  content: string;
};

export default async function (input: Input) {
  const noteId = await resolveAppleNoteId(input.noteId);
  return appendNoteBody(noteId, input.content);
}
