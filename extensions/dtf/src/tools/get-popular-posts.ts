import { getPopularPosts } from "../api/client";

type Input = {
  /**
   * Time period for popular posts: "day" for today, "week" for this week, "month" for this month.
   * Default is "day".
   */
  period?: "day" | "week" | "month";
  /**
   * Number of posts to fetch (default: 10, max: 20)
   */
  count?: number;
};

/**
 * Fetches popular and trending posts from DTF.
 * Returns most discussed and viewed posts for the specified time period.
 * Use this when user asks about popular content, trending posts, hot topics, or what's being discussed.
 */
export default async function tool(input: Input) {
  const period = input.period || "day";
  const count = Math.min(input.count || 10, 20);
  const posts = await getPopularPosts(period);

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
