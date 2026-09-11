import { Tool } from "@raycast/api";
import { clientV2 } from "../v2/lib/twitterapi_v2";
import { requirePostId } from "./inputs";

type Input = {
  /** Numeric ID of the X post to update. */
  postId: string;
  /** Whether the post should be reposted or have its repost removed by the authenticated user. */
  reposted: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `${input.reposted ? "Repost" : "Undo the repost of"} this post on X?`,
  info: [{ name: "Post ID", value: input.postId.trim() }],
});

/** Repost or undo the repost of a specific X post after user confirmation. */
export default async function setRepost(input: Input) {
  const postId = requirePostId(input.postId);
  if (input.reposted) await clientV2.retweetID(postId);
  else await clientV2.unretweetID(postId);
  return { postId, reposted: input.reposted };
}
