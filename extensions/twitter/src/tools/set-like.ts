import { Tool } from "@raycast/api";
import { clientV2 } from "../v2/lib/twitterapi_v2";
import { requirePostId } from "./inputs";

type Input = {
  /** Numeric ID of the X post to update. */
  postId: string;
  /** Whether the post should be liked or unliked by the authenticated user. */
  liked: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `${input.liked ? "Like" : "Unlike"} this post on X?`,
  info: [{ name: "Post ID", value: input.postId.trim() }],
});

/** Like or unlike a specific X post after user confirmation. */
export default async function setLike(input: Input) {
  const postId = requirePostId(input.postId);
  if (input.liked) await clientV2.likeTweetID(postId);
  else await clientV2.unlikeTweetID(postId);
  return { postId, liked: input.liked };
}
