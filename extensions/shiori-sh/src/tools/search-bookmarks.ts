import { searchBookmarks } from "../links-page";

type Input = {
  /** Full-text search across title, summary, and content. Omit to browse. */
  query?: string;
  /** Defaults to all bookmarks. */
  read?: "all" | "read" | "unread";
  /** Defaults to newest. Starred results use the server's starred-date ordering. */
  sort?: "newest" | "oldest";
  /** Only starred links when true. */
  favorite?: boolean;
  /** An existing tag name or tag ID. */
  tag?: string;
  /** Saved at or after an ISO 8601 timestamp or duration such as 1h, 7d, 2w, 1m, 1y. */
  since?: string;
  /** Number of results, 1–100. Defaults to 100. */
  limit?: number;
  /** Start at 0. For more results, pass nextOffset with the same filters. */
  offset?: number;
};

/** Search or browse one page of saved Shiori bookmarks without changing them. */
export default async function tool(input: Input) {
  const { query, ...filters } = input;
  return searchBookmarks({ ...filters, search: query?.trim() || undefined });
}
