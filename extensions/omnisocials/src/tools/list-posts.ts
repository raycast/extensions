import { listPosts } from "../lib/api";

type Input = {
  /**
   * Filter by post status: draft, scheduled, posted, or failed.
   */
  status?: "draft" | "scheduled" | "posted" | "failed";

  /**
   * Maximum number of posts to return. Defaults to 20.
   */
  limit?: number;
};

export default async function tool(input: Input) {
  const response = await listPosts(input.status, input.limit || 20);
  return {
    posts: response.data.map((post) => ({
      id: post.id,
      status: post.status,
      type: post.type,
      content: post.content.default,
      accounts: post.accounts,
      schedule_at: post.schedule_at,
      published_urls: post.published_urls,
      created_at: post.created_at,
    })),
    total: response.pagination.total,
  };
}
