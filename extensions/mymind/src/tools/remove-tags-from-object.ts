import { Tool } from "@raycast/api";
import { getObject, removeTagsFromObject } from "../api";
import { ObjectSummary, describeObject, runWrite, summarizeObject } from "./shared";

type Input = {
  /**
   * The id of the object to untag. Get this from the search-mymind tool.
   */
  id: string;
  /**
   * The tag names to remove from the object.
   */
  tags: string[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const tags = input.tags?.filter(Boolean) ?? [];

  return {
    message: "Remove these tags from this item?",
    info: [
      { name: "Item", value: await describeObject(input.id) },
      { name: "Tags", value: tags.join(", ") },
    ],
  };
};

/**
 * Remove one or more tags from an existing mymind object. Requires a
 * full-access key.
 */
export default async function tool(input: Input): Promise<ObjectSummary> {
  const tags = Array.from(new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean)));

  if (tags.length === 0) {
    throw new Error("At least one tag is required.");
  }

  return await runWrite(async () => {
    await removeTagsFromObject(
      input.id,
      tags.map((name) => ({ name })),
    );
    return summarizeObject(await getObject(input.id), { includeContent: true });
  });
}
