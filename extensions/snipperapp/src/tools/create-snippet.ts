import { Tool } from "@raycast/api";
import { createSnippet } from "../lib/snipper-helper";

type Input = {
  /** Title of the snippet. */
  title: string;
  /** The code or text content. */
  content: string;
  /** Optional language id (e.g. "typescript", "swift"). */
  language?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Create this snippet in your SnipperApp library?",
    info: [
      { name: "Title", value: input.title || "Untitled" },
      { name: "Language", value: input.language ?? "Plain Text" },
    ],
  };
};

export default async function tool(input: Input) {
  const message = await createSnippet({
    title: input.title || "Untitled",
    content: input.content,
    language: input.language,
  });
  return { ok: true, message };
}
