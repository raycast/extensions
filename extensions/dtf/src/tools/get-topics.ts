import { getTopics } from "../api/client";

/**
 * Returns list of available topics/categories on DTF.
 * Topics include Games, Movies, TV Shows, Gamedev, etc.
 * Use this when user asks what topics are available or wants to browse by category.
 */
export default async function tool() {
  const topics = await getTopics();

  return topics.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description || "",
    subscribers: t.counters.subscribers,
    posts: t.counters.entries,
  }));
}
