import { fetchLinks } from "../api";
import { Link } from "../types";

type Input = {
  /**
   * Maximum number of unread links to return. Defaults to 20.
   */
  limit?: number;
};

type OutputLink = {
  id: string;
  url: string;
  title: string;
  domain: string;
  summary: string | null;
  savedAt: string;
};

/**
 * Retrieve all unread bookmarks from the user's Shiori library.
 */
export default async function tool(
  input: Input,
): Promise<{ success: boolean; links: OutputLink[]; total: number; error?: string }> {
  try {
    const limit = input.limit ?? 20;
    const result = await fetchLinks({ limit, read: "unread", sort: "newest" });

    const links: OutputLink[] = result.links.map((link: Link) => ({
      id: link.id,
      url: link.url,
      title: link.title,
      domain: link.domain,
      summary: link.summary,
      savedAt: link.created_at,
    }));

    return {
      success: true,
      links,
      total: result.total,
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
