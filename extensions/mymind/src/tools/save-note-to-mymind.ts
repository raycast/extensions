import { Tool } from "@raycast/api";
import { createObject } from "../api";

type Input = {
  /** Markdown content for the note. Required and non-empty. */
  content: string;
  /** Optional title. */
  title?: string;
  /** Optional tags. */
  tags?: string[];
};

/**
 * Saves a markdown note to mymind. The user's writing style is preserved —
 * no transformation is applied to the markdown.
 */
export default async function (input: Input): Promise<{ id: string; title?: string }> {
  if (!input.content.trim()) {
    throw new Error("Note content is required");
  }
  const created = await createObject({
    kind: "note",
    markdown: input.content,
    title: input.title?.trim() || undefined,
    tags: input.tags?.map((t) => t.trim()).filter(Boolean),
  });
  return { id: created.id, title: created.title };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const preview = input.content.length > 200 ? `${input.content.slice(0, 200)}…` : input.content;
  const items = [{ name: "Content", value: preview }];
  if (input.title) items.push({ name: "Title", value: input.title });
  if (input.tags?.length) items.push({ name: "Tags", value: input.tags.join(", ") });
  return { info: items };
};
