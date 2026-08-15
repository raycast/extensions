import { searchReferences } from "../lib/api";

type Input = {
  /** Free-text query describing the design references to find (e.g. "dark dashboard", "retro car ad"). */
  query?: string;
  /** Optional Gather category id to scope the search to. Use list-categories to resolve a name to an id. */
  categoryId?: string;
  /** Optional tags to require (AND-combined). */
  tags?: string[];
  /** Restrict to images, links, or videos. Defaults to all. */
  kind?: "all" | "images" | "links" | "videos";
  /** Max results to return (1–50, default 8). */
  limit?: number;
};

/**
 * Search the user's Gather design-reference library and return matching
 * references with their descriptions, tags, categories, and image URLs.
 */
export default async function tool(input: Input) {
  const result = await searchReferences({
    query: input.query,
    categoryId: input.categoryId,
    tags: input.tags,
    kind: input.kind ?? "all",
    limit: Math.min(Math.max(input.limit ?? 8, 1), 50),
    sort: "newest",
  });
  return result.items.map((ref) => ({
    id: ref.id,
    title: ref.title,
    description: ref.description,
    tags: ref.tags,
    categories: ref.categories,
    sourceUrl: ref.sourceUrl,
    imageUrl: ref.imageUrl,
  }));
}
