import { searchPosts } from "../api/client";

type Input = {
  /**
   * Search query - keywords to search for in post titles and content.
   * Can be a game name, topic, person name, or any relevant keywords.
   */
  query: string;
  /**
   * Maximum number of results to return (default: 10, max: 20)
   */
  count?: number;
};

/**
 * Searches posts on DTF by keyword.
 * Returns posts matching the search query with titles, excerpts, and stats.
 * Use this when user wants to find specific content, posts about a game, movie, person, or any topic.
 */
export default async function tool(input: Input) {
  if (!input.query?.trim()) {
    return { error: "Search query is required" };
  }

  const count = Math.min(input.count || 10, 20);
  const posts = await searchPosts(input.query.trim());

  return posts.slice(0, count).map((p) => ({
    title: p.title,
    excerpt: p.excerpt || "",
    url: p.url,
    views: p.stats.views,
    comments: p.stats.comments,
    likes: p.stats.likes,
    date: p.date.toISOString(),
    author: p.author.name,
    category: p.subsite.name || undefined,
  }));
}
