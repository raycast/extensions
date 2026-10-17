import { Tool } from "@raycast/api";
import { accountLabel, createPost, listConnections } from "../api";

type Input = {
  /** The connectionId of the account, from list-accounts. */
  connectionId: string;
  /** The post text, exactly as it should appear. */
  postText: string;
  /** ISO 8601 time to publish at. Leave empty to use the account's next free queue slot. */
  scheduledAt?: string;
  /** True only when the user asked to post right now. */
  publishNow?: boolean;
};

// Posting to someone's real account is visible to their audience, so Raycast asks before it happens.
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const account = (await listConnections()).find(
    (c) => c.id === input.connectionId,
  );
  const when = input.scheduledAt
    ? new Date(input.scheduledAt).toLocaleString()
    : input.publishNow
      ? "Now"
      : "Next free queue slot";
  return {
    message: "Create this post on ShapelessAI?",
    info: [
      {
        name: "Account",
        value: account ? accountLabel(account) : input.connectionId,
      },
      { name: "When", value: when },
      { name: "Text", value: input.postText },
    ],
  };
};

export default async function tool(input: Input) {
  const post = await createPost(input);
  return {
    id: post.id,
    status: post.status,
    scheduledAt: post.scheduledAt,
    publishedLocation: post.publishedLocation,
  };
}
