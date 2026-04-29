import { Tool } from "@raycast/api";
import { createObject } from "../api";

type Input = {
  /** A remote URL to save to mymind. Must start with http:// or https://. */
  url: string;
  /** Optional title for the saved card. */
  title?: string;
  /** Optional tags to attach to the saved card. */
  tags?: string[];
};

/**
 * Saves a URL to mymind. mymind fetches the page and creates a card with
 * its title, image, and extracted content automatically.
 */
export default async function (input: Input): Promise<{ id: string; title?: string }> {
  if (!/^https?:\/\/\S+$/i.test(input.url.trim())) {
    throw new Error("URL must start with http:// or https://");
  }
  const created = await createObject({
    kind: "url",
    url: input.url.trim(),
    title: input.title?.trim() || undefined,
    tags: input.tags?.map((t) => t.trim()).filter(Boolean),
  });
  return { id: created.id, title: created.title };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const items = [{ name: "URL", value: input.url }];
  if (input.title) items.push({ name: "Title", value: input.title });
  if (input.tags?.length) items.push({ name: "Tags", value: input.tags.join(", ") });
  return { info: items };
};
