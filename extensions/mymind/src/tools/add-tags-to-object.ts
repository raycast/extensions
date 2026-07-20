import { Tool } from "@raycast/api";
import { addTagsToObject, getObject } from "../api";
import { ObjectSummary, describeObject, runWrite, summarizeObject } from "./shared";

type Input = {
  /**
   * The id of the object to tag. Get this from the search-mymind tool.
   */
  id: string;
  /**
   * The tag names to add. Prefer reusing existing tags from the list-tags tool.
   */
  tags: string[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const tags = input.tags?.filter(Boolean) ?? [];

  return {
    message: "Add these tags to this item?",
    info: [
      { name: "Item", value: await describeObject(input.id) },
      { name: "Tags", value: tags.join(", ") },
    ],
  };
};

/**
 * Add one or more tags to an existing mymind object. Requires a full-access key.
 */
export default async function tool(input: Input): Promise<ObjectSummary> {
  const tags = Array.from(new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean)));

  if (tags.length === 0) {
    throw new Error("At least one tag is required.");
  }

  return await runWrite(async () => {
    await addTagsToObject(input.id, tags);
    return summarizeObject(await getObject(input.id), { includeContent: true });
  });
}
