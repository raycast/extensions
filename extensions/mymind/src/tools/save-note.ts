import { createObject } from "../api";
import { ObjectSummary, runWrite, summarizeObject } from "./shared";

type Input = {
  /**
   * The Markdown body of the note. This is the main content of the note.
   */
  body: string;
  /**
   * An optional title for the note.
   */
  title?: string;
  /**
   * Optional list of tag names to apply. Prefer reusing existing tags from the
   * list-tags tool.
   */
  tags?: string[];
  /**
   * Optional id of a space to add the note to. Resolve names to ids with the
   * list-spaces tool.
   */
  spaceId?: string;
};

/**
 * Save a text note (Markdown) to the user's mymind library, optionally with a
 * title, tags, and a space. Requires a full-access key.
 */
export default async function tool(input: Input): Promise<ObjectSummary> {
  const body = input.body?.trim();

  if (!body) {
    throw new Error("A note body is required.");
  }

  return await runWrite(async () => {
    const { object } = await createObject({
      title: input.title?.trim() || undefined,
      content: body,
      tags: input.tags,
      spaceId: input.spaceId,
    });

    return summarizeObject(object, { includeContent: true });
  });
}
