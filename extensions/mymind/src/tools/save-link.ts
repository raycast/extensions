import { createObject, createObjectNote, getObject } from "../api";
import { isProbablyUrl } from "../save-input";
import { ObjectSummary, runWrite, summarizeObject } from "./shared";

type Input = {
  /**
   * The http(s) URL to save to mymind.
   */
  url: string;
  /**
   * An optional title for the saved link. When omitted, mymind derives one from
   * the page.
   */
  title?: string;
  /**
   * Optional note body (Markdown) to attach to the saved link.
   */
  note?: string;
  /**
   * Optional list of tag names to apply. Prefer reusing existing tags from the
   * list-tags tool.
   */
  tags?: string[];
  /**
   * Optional id of a space to add the link to. Resolve names to ids with the
   * list-spaces tool.
   */
  spaceId?: string;
};

/**
 * Save a URL to the user's mymind library, optionally with a title, an attached
 * note, tags, and a space. Requires a full-access key.
 */
export default async function tool(input: Input): Promise<ObjectSummary> {
  const url = input.url?.trim();

  if (!url || !isProbablyUrl(url)) {
    throw new Error("A valid http(s) URL is required to save a link.");
  }

  return await runWrite(async () => {
    const { object } = await createObject({
      url,
      title: input.title?.trim() || undefined,
      tags: input.tags,
      spaceId: input.spaceId,
    });

    const note = input.note?.trim();

    if (note) {
      await createObjectNote(object.id, note);
      return summarizeObject(await getObject(object.id), { includeContent: true });
    }

    return summarizeObject(object, { includeContent: true });
  });
}
