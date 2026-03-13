import { Tool } from "@raycast/api";
import { getDrafts } from "../utils/get-drafts";
import { CallbackUrl } from "../utils/CallbackUrlUtils";
import { CallbackBaseUrls } from "../utils/Defines";

type Input = {
  /**
   * The UUID of the draft.
   */
  uuid: string;
  /**
   * Prepend text to the draft.
   *
   * - true - prepend text to the draft
   * - false - append text to the draft
   */
  prependText: boolean;
  /**
   * The content that should be added to the draft, formatted as markdown, so that it can be pasted into Drafts app.
   *
   * - The note should be clear and concise.
   * - The title should be short and descriptive and formatted as H1 header.
   * - Don't directly address the reader. Write the note from an objective point of view.
   * - Use the same language as the original text.
   * - Break the content into paragraphs with line breaks.
   * - Format links as Markdown links with the correct title (e.g. [Example Webpage](https://example.com)).
   * - Format tasks or checklist items with markdown checkboxes `- [ ]`.
   * - Use a consistent style for the note.
   * - The most relevant links to the source (if available) should be added below the title.
   *
   * Example:
   * ```markdown
   * # Title
   *
   * ## Paragraph 1
   *
   * ## Paragraph 2
   * ```
   */
  textToAdd: string;
};

export default async function (input: Input) {
  let drafts = await getDrafts();
  drafts = drafts.filter((draft) => draft.uuid === input.uuid);
  if (drafts.length != 1) {
    return false;
  }

  const callbackUrl = new CallbackUrl(
    input.prependText ? CallbackBaseUrls.PREPEND_TO_DRAFT : CallbackBaseUrls.APPEND_TO_DRAFT
  );

  callbackUrl.addParam({ name: "uuid", value: input.uuid });
  callbackUrl.addParam({ name: "text", value: input.textToAdd });
  await callbackUrl.openCallbackUrl();
  return true;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // show textToAdd, text add mode and the title of the draft
  return {
    info: [
      { name: "Content", value: input.textToAdd },
      { name: "Text add mode", value: input.prependText ? "Prepend" : "Append" },
      { name: "Draft", value: input.uuid },
    ],
  };
};
