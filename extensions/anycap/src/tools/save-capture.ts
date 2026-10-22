import { Tool } from "@raycast/api";
import { asURL } from "../anycap";
import { submitCapture } from "../capture-input";

type Input = {
  /** An http/https link, or the complete note text to save. Preserve the user's words. */
  content: string;
  /** Optional title. */
  title?: string;
  /** Existing Anycap folder name, or Inbox. Use list-folders when unsure. */
  folder?: string;
  /** Comma-separated tags, without the # prefix. */
  tags?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Save this capture to Anycap?",
  info: [
    { name: "Content", value: input.content },
    { name: "Title", value: input.title },
    { name: "Folder", value: input.folder || "Inbox" },
    { name: "Tags", value: input.tags },
  ],
});

export default async function saveCapture(input: Input) {
  return submitCapture(
    {
      type: asURL(input.content) ? "link" : "note",
      title: input.title ?? "",
      url: input.content,
      body: input.content,
      folder: input.folder ?? "Inbox",
      tags: input.tags ?? "",
    },
    "Raycast AI",
  );
}
