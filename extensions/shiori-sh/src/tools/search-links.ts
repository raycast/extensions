import { fetchLinks } from "../api";
import { Link } from "../types";

type Input = {
  /**
   * The search query to filter bookmarks by. Searches across title, URL, and domain.
   */
  query: string;
  /**
   * Maximum number of results to return. Defaults to 20.
   */
  limit?: number;
};

type OutputLink = {
  id: string;
  url: string;
  title: string;
  domain: string;
  summary: string | null;
  read: boolean;
  savedAt: string;
};

/**
 * Search the user's Shiori bookmarks by title, URL, or domain.
 */
export default async function tool(
  input: Input,
): Promise<{ success: boolean; links: OutputLink[]; total: number; error?: string }> {
  try {
    const limit = input.limit ?? 20;
    const result = await fetchLinks({ limit: 100, read: "all", sort: "newest" });

    const query = input.query.toLowerCase();
    const filtered = result.links
      .filter(
        (link: Link) =>
          link.title.toLowerCase().includes(query) ||
          link.url.toLowerCase().includes(query) ||
          link.domain.toLowerCase().includes(query),
      )
      .slice(0, limit);

    const links: OutputLink[] = filtered.map((link: Link) => ({
      id: link.id,
      url: link.url,
      title: link.title,
      domain: link.domain,
      summary: link.summary,
      read: !!link.read_at,
      savedAt: link.created_at,
    }));

    return {
      success: true,
      links,
      total: links.length,
    };
  } catch (error) {
    return {
      success: false,
      links: [],
      total: 0,
      error: (error as Error).message,
    };
  }
}
