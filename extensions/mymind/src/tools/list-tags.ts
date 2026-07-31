import { listTags } from "../api";
import { isUserTag } from "../tag-utils";

type TagSummary = {
  name: string;
  count?: number;
};

/**
 * List the user's own manual tags. Automatically generated tags are excluded.
 * Use this to discover existing tag names before tagging an item so you reuse
 * them instead of creating near-duplicates.
 */
export default async function tool(): Promise<TagSummary[]> {
  const tags = await listTags();
  return tags
    .filter(isUserTag)
    .map((tag) => ({ name: tag.name, count: tag.count }))
    .filter((tag) => Boolean(tag.name));
}
