import { getFreshPosts } from "../api/client";

type Input = {
  /**
   * Filter for fresh posts:
   * - "from-10": New posts (default)
   * - "from5": Posts with +5 rating or higher
   * - "from10": Posts with +10 rating or higher
   * - "all": All fresh posts
   */
  filter?: "from-10" | "from5" | "from10" | "all";
  /**
   * Number of posts to fetch (default: 10, max: 20)
   */
  count?: number;
};

/**
 * Fetches fresh/new posts from DTF.
 * Returns the latest posts from users with optional rating filters.
 * Use this when user asks about fresh content, new posts, recent user posts, or latest submissions.
 */
export default async function tool(input: Input) {
  const filter = input.filter || "from-10";
  const count = Math.min(input.count || 10, 20);
  const posts = await getFreshPosts(filter);

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
