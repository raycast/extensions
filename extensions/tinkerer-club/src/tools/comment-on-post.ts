import { Tool } from "@raycast/api";
import { TinkererCommunity } from "../api/community";
import { getApiClient } from "../api/preferences";
import { unwrapPayload } from "../lib/json";

type Input = {
  /** Comment text to publish. Maximum 5,000 characters. */
  content: string;
  /** Comment ID to reply to. Omit to add a top-level comment. */
  parentId?: string;
  /** Exact Tinkerer Club post ID. */
  postId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: input.parentId ? "Post this reply to Tinkerer Club?" : "Post this comment to Tinkerer Club?",
  info: [
    { name: "Post", value: input.postId },
    ...(input.parentId ? [{ name: "Replying to", value: input.parentId }] : []),
    { name: "Text", value: input.content },
  ],
});

export default async function commentOnPost(input: Input) {
  const postId = input.postId.trim();
  const content = input.content.trim();
  const parentId = input.parentId?.trim();
  if (!postId) throw new Error("A post ID is required.");
  if (!content) throw new Error("Comment text is required.");
  if (content.length > 5_000) throw new Error("Comment text must not exceed 5,000 characters.");

  const result = await new TinkererCommunity(getApiClient()).addComment(postId, content, parentId);
  return unwrapPayload(result);
}
