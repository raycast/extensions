import { Tool } from "@raycast/api";
import { clientV2 } from "../v2/lib/twitterapi_v2";
import { requirePostId, requirePostText } from "./inputs";

type Input = {
  /** Numeric ID of the X post to reply to. */
  postId: string;
  /** Exact public reply text. Must contain 1 to 280 characters. */
  text: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Publish this reply on X?",
  info: [
    { name: "Reply", value: input.text.trim() },
    { name: "Replying To Post", value: input.postId.trim() },
  ],
});

/** Publish a public reply to a specific X post after user confirmation. */
export default async function replyToPost(input: Input) {
  const postId = requirePostId(input.postId);
  const text = requirePostText(input.text);
  await clientV2.replyTweetID(text, postId);
  return { replied: true, postId, text };
}
