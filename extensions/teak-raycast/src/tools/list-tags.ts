import { listTags } from "../lib/api";

type Input = {
  /** Optional substring to filter tag names (case-insensitive). */
  filter?: string;
  /** Maximum number of tags to return. Defaults to 50. */
  limit?: number;
};

/**
 * List the user's Teak tags with per-tag card counts.
 */
export default async function tool(input: Input = {}) {
  const { items } = await listTags();

  const normalizedFilter = input.filter?.trim().toLowerCase();
  const filtered = normalizedFilter
    ? items.filter((tag) => tag.name.toLowerCase().includes(normalizedFilter))
    : items;

  const limit = Math.max(1, Math.min(input.limit ?? 50, 200));

  return filtered.slice(0, limit).map((tag) => ({
    count: tag.count,
    name: tag.name,
  }));
}
