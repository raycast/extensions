import { TinkererCommunity } from "../api/community";
import { getApiClient } from "../api/preferences";

type Input = {
  /** Number of recent posts to return, from 1 to 50. */
  limit?: number;
};

export default async function getFeed(input: Input) {
  const requestedLimit = Number.isFinite(input.limit) ? Math.trunc(input.limit as number) : 20;
  const limit = Math.min(50, Math.max(1, requestedLimit));
  const page = await new TinkererCommunity(getApiClient()).feed(limit);

  return {
    nextCursor: page.nextCursor,
    posts: page.posts.map((post) => ({
      author: post.author,
      commentCount: post.commentCount,
      content: post.content,
      id: post.id,
      imageUrls: post.imageUrls,
      publishedAt: post.publishedAt,
      reactionCount: post.reactionCount,
      reactions: post.reactions,
      title: post.title,
      topics: post.topics,
      type: post.type,
      url: post.url,
      viewerReaction: post.viewerReaction,
    })),
  };
}
