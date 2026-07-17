import { Tool } from "@raycast/api";
import { createIdea } from "../lib/buffer";

type Input = {
  /** Short title for the idea. */
  title: string;
  /** Optional notes or draft text for the idea. */
  text?: string;
};

/**
 * Asks the user to confirm before the idea is created, since this writes to
 * their Buffer account.
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Create this idea in Buffer?",
    info: [{ name: "Title", value: input.title }, ...(input.text ? [{ name: "Notes", value: input.text }] : [])],
  };
};

export default async function (input: Input) {
  const title = input.title?.trim();
  if (!title) {
    throw new Error("An idea needs a non-empty title.");
  }
  await createIdea({ title, text: input.text?.trim() || undefined });
  return { created: true, title };
}
