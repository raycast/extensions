import { Tool } from "@raycast/api";

import { saveReferenceUrl } from "../lib/api";

type Input = {
  /** The URL of the link or image to save to Gather. */
  url: string;
  /** Optional Gather category id to assign. */
  categoryId?: string;
};

/** Save a link or image URL to the user's Gather library. */
export default async function tool(input: Input) {
  const result = await saveReferenceUrl(input.url, {
    categoryId: input.categoryId,
  });
  return { id: result.id, saved: true };
}

// Writes data, so confirm before running.
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Save this to Gather?`,
  info: [{ name: "URL", value: input.url }],
});
