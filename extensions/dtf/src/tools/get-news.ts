import { getNews } from "../api/client";

type Input = {
  /**
   * Number of news items to fetch (default: 10, max: 20)
   */
  count?: number;
};

/**
 * Fetches latest news from DTF editorial team.
 * Returns news articles with titles, excerpts, view counts, and comment counts.
 * Use this when user asks about recent news, today's news, or editorial content.
 */
export default async function tool(input: Input) {
  const count = Math.min(input.count || 10, 20);
  const { posts } = await getNews();

  return posts.slice(0, count).map((p) => ({
    title: p.title,
    excerpt: p.excerpt || "",
    url: p.url,
    views: p.stats.views,
    comments: p.stats.comments,
    likes: p.stats.likes,
    date: p.date.toISOString(),
    author: p.author.name,
  }));
}
