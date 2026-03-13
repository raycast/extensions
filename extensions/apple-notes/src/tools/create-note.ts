import { Tool } from "@raycast/api";

import { createNote } from "../api/applescript";

type Input = {
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
  /**
   * The unformatted content of the note to create, without any HTML tags.
   */
  raw_content: string;
};

export default async function (input: Input) {
  return createNote(input.content);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return { info: [{ name: "Content", value: input.raw_content }] };
};
