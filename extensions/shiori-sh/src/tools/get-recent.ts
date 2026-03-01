import { fetchLinks } from "../api";
import { Link } from "../types";

type Input = {
  /**
   * Maximum number of recent links to return. Defaults to 10.
   */
  limit?: number;
  /**
   * Whether to include read links. Defaults to true (includes all).
   */
  includeRead?: boolean;
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
 * Retrieve recently saved bookmarks from the user's Shiori library.
 */
export default async function tool(
  input: Input,
): Promise<{ success: boolean; links: OutputLink[]; total: number; error?: string }> {
  try {
    const limit = input.limit ?? 10;
    const readFilter = input.includeRead === false ? "unread" : "all";
    const result = await fetchLinks({ limit, read: readFilter, sort: "newest" });

    const links: OutputLink[] = result.links.map((link: Link) => ({
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
