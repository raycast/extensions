import { TinkererApiClient } from "./client";
import { FeedComment, FeedPage, parseComments, parseFeedPage } from "../lib/feed";
import { isJsonObject, unwrapPayload } from "../lib/json";
import {
  AddCommentInput,
  CommentReactionInput,
  JsonValue,
  ListCommentsInput,
  PostReactionInput,
  RemoveCommentReactionInput,
  RemovePostReactionInput,
  TimelineInput,
} from "../types/api";

function reportedCommentCount(value: JsonValue): number | undefined {
  const payload = unwrapPayload(value);
  const post = isJsonObject(payload) && isJsonObject(payload.post) ? payload.post : payload;
  if (!isJsonObject(post)) return undefined;

  for (const key of ["commentCount", "commentsCount", "replyCount"] as const) {
    const count = post[key];
    if (typeof count === "number" && Number.isFinite(count)) return count;
  }
  return undefined;
}

export class TinkererCommunity {
  constructor(readonly client: TinkererApiClient) {}

  async feed(limit = 30, signal?: AbortSignal): Promise<FeedPage> {
    const input: TimelineInput = { limit, supportsSparsePages: false };
    const result = await this.client.call({ path: "post.timeline", type: "query" }, input, signal);
    return parseFeedPage(result, this.client.baseUrl);
  }

  async comments(postId: string, signal?: AbortSignal): Promise<FeedComment[]> {
    const input: ListCommentsInput = { limit: 50, postId };
    const result = await this.client.call({ path: "post.listComments", type: "query" }, input, signal);
    return parseComments(result, this.client.baseUrl);
  }

  async post(postId: string, signal?: AbortSignal): Promise<JsonValue> {
    const result = await this.client.call({ path: "post.byId", type: "query" }, { id: postId }, signal);
    return unwrapPayload(result);
  }

  async thread(postId: string, signal?: AbortSignal): Promise<{ comments: JsonValue; post: JsonValue }> {
    const post = await this.client.call({ path: "post.byId", type: "query" }, { id: postId }, signal);
    const postPayload = unwrapPayload(post);
    if (reportedCommentCount(postPayload) === 0) return { comments: [], post: postPayload };

    const comments = await this.client.call(
      { path: "post.listComments", type: "query" },
      { limit: 50, postId },
      signal,
    );
    return { comments: unwrapPayload(comments), post: postPayload };
  }

  async addComment(postId: string, content: string, parentId?: string): Promise<JsonValue> {
    const input: AddCommentInput = { content, images: [], postId, ...(parentId ? { parentId } : {}) };
    return this.client.call({ path: "post.addComment", type: "mutation" }, input);
  }

  async reactToPost(postId: string, reaction: string): Promise<JsonValue> {
    const input: PostReactionInput = { postId, reaction };
    return this.client.call({ path: "post.like", type: "mutation" }, input);
  }

  async removePostReaction(postId: string, reaction?: string): Promise<JsonValue> {
    const input: RemovePostReactionInput = { postId, ...(reaction ? { reaction } : {}) };
    return this.client.call({ path: "post.unlike", type: "mutation" }, input);
  }

  async reactToComment(commentId: string, reaction: string): Promise<JsonValue> {
    const input: CommentReactionInput = { commentId, reaction };
    return this.client.call({ path: "post.reactToComment", type: "mutation" }, input);
  }

  async removeCommentReaction(commentId: string): Promise<JsonValue> {
    const input: RemoveCommentReactionInput = { commentId };
    return this.client.call({ path: "post.removeCommentReaction", type: "mutation" }, input);
  }
}
