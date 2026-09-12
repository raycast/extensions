import { Tool } from "@raycast/api";
import { clientV2 } from "../v2/lib/twitterapi_v2";
import { requirePostId } from "./inputs";

type Input = {
  /** Numeric ID of a reply in a conversation started by the authenticated user. */
  postId: string;
  /** Whether the reply should be hidden or visible. */
  hidden: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `${input.hidden ? "Hide" : "Unhide"} this reply on X?`,
  info: [{ name: "Reply Post ID", value: input.postId.trim() }],
});

/** Hide or unhide a reply in the authenticated user's conversation after confirmation. */
export default async function setReplyHidden(input: Input) {
  const postId = requirePostId(input.postId);
  await clientV2.setReplyHidden(postId, input.hidden);
  return { postId, hidden: input.hidden };
}
