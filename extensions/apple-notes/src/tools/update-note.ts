import { setNoteBody } from "../api/applescript";

type Input = {
  /** The ID of the note to get the content of */
  noteId: string;
  /**
   * The content of the note to create, formatted as HTML, so that it can be pasted into Apple Notes.
   *
   * - The note should be clear and concise.
   * - The title should be short and descriptive and wrapped in an <h1> tag.
   * - Don't directly address the reader. Write the note from an objective point of view.
   * - Use the same language as the original text.
   * - Break the content into paragraphs with line breaks.
   * - Don't use Markdown links (e.g. [Link](https://example.com)), use HTML links (e.g. <a href="https://example.com">Link</a>).
   *
   * Example:
   * ```html
   * <h1>Title</h1>
   * <br/>
   * <p>Paragraph 1</p>
   * <br/>
   * <p>Paragraph 2</p>
   * ```
   */
  content: string;
};

export default async function (input: Input) {
  const note = await setNoteBody(input.noteId, input.content);
  return note;
}
