import { Tool } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { showSuccessToast } from "../utils/NotificationUtils";

type Input = {
  /**
   * The content of the draft / note to create, formatted as markdown, so that it can be pasted into Drafts app.
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
   * This is an example paragraph containing a [link](https://example.com).
   *
   * ## Paragraph 2
   *
   * - [ ] Task 1
   * - [ ] Task 2
   *
   * ```
   */
  content: string;
};

export default async function (input: Input) {
  // Escape the content for AppleScript
  const escapedContent = input.content
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\n/g, "\\n"); // Escape newlines

  try {
    const res = await runAppleScript(
      `
    on escapeString(inputStr)
      return inputStr
    end escapeString

    on run argv
      set escapedContent to escapeString("${escapedContent}")
      tell application "Drafts"
        make new draft with properties {content: escapedContent, flagged:false}
      end tell
    end run 
      `
    );
    await showSuccessToast("Created Draft 👍");
    return res;
  } catch (error) {
    await showFailureToast("Failed to create Draft");
    return;
  }
}

// todo: do we really need to confirm that?
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return { info: [{ name: "Content", value: input.content }], message: "Are you sure you want to create this draft?" };
};
