import { getTopics, getSubsitePosts } from "../api/client";

type Input = {
  /**
   * Topic name to get posts from (e.g., "Игры", "Кино", "Gamedev", "Сериалы").
   * Use get-topics first to see available topics if unsure.
   */
  topic: string;
  /**
   * Number of posts to fetch (default: 10, max: 20)
   */
  count?: number;
  /**
   * Sorting: "date" for newest first, "hotness" for most popular
   */
  sorting?: "date" | "hotness";
};

/**
 * Fetches posts from a specific DTF topic/category.
 * Use this when user wants to see content from a specific category like Games, Movies, etc.
 * First use get-topics to find the correct topic name if needed.
 */
export default async function tool(input: Input) {
  if (!input.topic?.trim()) {
    return { error: "Topic name is required" };
  }

  const count = Math.min(input.count || 10, 20);
  const sorting = input.sorting || "date";

  // Find the topic by name (case-insensitive)
  const topics = await getTopics();
  const topicLower = input.topic.toLowerCase();
  const topic = topics.find((t) => t.name.toLowerCase() === topicLower || t.name.toLowerCase().includes(topicLower));

  if (!topic) {
    const availableTopics = topics.map((t) => t.name).join(", ");
    return {
      error: `Topic "${input.topic}" not found. Available topics: ${availableTopics}`,
    };
  }

  const { posts } = await getSubsitePosts(topic.id, sorting);

  return {
    topic: topic.name,
    posts: posts.slice(0, count).map((p) => ({
      title: p.title,
      excerpt: p.excerpt || "",
      url: p.url,
      views: p.stats.views,
      comments: p.stats.comments,
      likes: p.stats.likes,
      date: p.date.toISOString(),
      author: p.author.name,
    })),
  };
}
