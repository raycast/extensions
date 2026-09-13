import { TinkererCommunity } from "../api/community";
import { FeedComment, FeedPost } from "./feed";

export interface ConversationState {
  comments: FeedComment[];
  post: FeedPost;
}

export async function loadConversation(
  post: FeedPost,
  community: TinkererCommunity,
  signal?: AbortSignal,
): Promise<ConversationState> {
  if (post.commentCount === 0) return { comments: [], post };
  return { comments: await community.comments(post.id, signal), post };
}
