import { Action, Tool } from "@raycast/api";
import { clientV2 } from "../v2/lib/twitterapi_v2";
import { requirePostId } from "./inputs";

type Input = {
  /** Numeric ID of a post owned by the authenticated X user. */
  postId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  style: Action.Style.Destructive,
  message: "Permanently delete this post from X?",
  info: [{ name: "Post ID", value: input.postId.trim() }],
});

/** Permanently delete a post owned by the authenticated X user after destructive confirmation. */
export default async function deletePost(input: Input) {
  const postId = requirePostId(input.postId);
  await clientV2.deleteTweetID(postId);
  return { deleted: true, postId };
}
