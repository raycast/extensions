import { searchBookmarks } from "../links-page";

type Input = {
  /** Topic keywords to search across saved titles, summaries, and content. */
  topic: string;
  /** An existing tag name or tag ID. */
  tag?: string;
  /** Only starred unread links when true. */
  favorite?: boolean;
  /** Saved since an ISO 8601 timestamp or duration such as 7d or 2w. */
  since?: string;
  /** Defaults to newest. */
  sort?: "newest" | "oldest";
  /** Number of results, 1–100. Defaults to 100. */
  limit?: number;
  /** Start at 0. Continue with nextOffset and the same topic and filters. */
  offset?: number;
};

/** Find unread bookmarks about a topic using Shiori full-text search. Does not mark them read. */
export default async function tool(input: Input) {
  const { topic, ...filters } = input;
  if (!topic.trim()) throw new Error("Enter a topic to find unread bookmarks.");
  return searchBookmarks({ ...filters, search: topic.trim(), read: "unread" });
}
