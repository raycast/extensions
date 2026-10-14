import { listPosts } from "../api";

type Input = {
  /** One of proposed, scheduled, published, failed, canceled. Leave empty for all. */
  status?: string;
  /** How many posts to return, 1 to 50. Defaults to 20. */
  limit?: number;
};

export default async function tool({ status, limit }: Input) {
  const posts = await listPosts(
    status || undefined,
    Math.min(Math.max(limit ?? 20, 1), 50),
  );
  return posts.map(
    ({
      id,
      platform,
      status,
      postText,
      scheduledAt,
      publishedAt,
      publishedLocation,
      error,
    }) => ({
      id,
      platform,
      status,
      postText,
      scheduledAt,
      publishedAt,
      publishedLocation,
      error,
    }),
  );
}
