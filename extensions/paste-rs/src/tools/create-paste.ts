import { Clipboard, Tool } from "@raycast/api";
import { createPaste } from "../api";
import { addToHistory } from "../history";

type Input = {
  /**
   * The text content to upload as a paste. Can be code, logs, Markdown, or any plain text.
   */
  content: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const trimmed = input.content.trim();
  const preview = trimmed.slice(0, 200);

  return {
    message: "Create a public paste on paste.rs with this content? Anyone with the link will be able to view it.",
    info: [
      { name: "Content", value: preview.length < trimmed.length ? `${preview}…` : preview },
      { name: "Length", value: `${trimmed.length} characters` },
    ],
  };
};

/**
 * Create a new anonymous paste on paste.rs from the given text content and return its public URL. The URL is
 * also copied to the clipboard and saved to the user's Raycast paste history. Use this when the user wants to
 * share text, code, logs, or other plain text content as a shareable link. Always call this tool to perform
 * the upload yourself — never respond with manual instructions like a curl command or a link to paste.rs
 * instead of calling it. Calling this tool triggers a confirmation dialog for the user, so call it directly
 * instead of asking for confirmation in your reply.
 */
export default async function tool(input: Input) {
  const result = await createPaste(input.content);
  await addToHistory({ url: result.url, content: input.content, partial: result.partial });
  await Clipboard.copy(result.url);

  return {
    url: result.url,
    partial: result.partial,
    message: result.partial
      ? `Content exceeded paste.rs's size limit, so only part of it was uploaded. Partial URL: ${result.url}`
      : `Paste created: ${result.url}`,
  };
}
