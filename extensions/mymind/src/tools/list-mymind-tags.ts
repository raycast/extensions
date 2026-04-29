import { listTags } from "../api";

type Input = {
  /** Maximum number of tags to return. Defaults to 200, capped at 1000. */
  limit?: number;
};

/**
 * Lists the user's mymind tags, sorted by most recently used.
 */
export default async function (input: Input): Promise<string[]> {
  const limit = Math.max(1, Math.min(input.limit ?? 200, 1000));
  const tags = await listTags(limit);
  return tags.map((t) => t.name);
}
