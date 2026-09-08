import { Tool } from "@raycast/api";
import { clientV2, ReplySettings } from "../v2/lib/twitterapi_v2";
import { requirePostText } from "./inputs";

type Input = {
  /** Exact ordered text for each public post in the thread. */
  posts: string[];
  /** Who can reply to each post in the thread. */
  replySettings?: ReplySettings;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Publish this ${input.posts.length}-post thread on X?`,
  info: input.posts.map((post, index) => ({ name: `Post ${index + 1}`, value: post.trim() })),
});

/** Publish an ordered thread, with each new post replying to the preceding post. */
export default async function postThread(input: Input) {
  if (input.posts.length < 2) throw new Error("A thread needs at least two posts. Use post for a single post.");
  if (input.posts.length > 25) throw new Error("Publish at most 25 posts in one thread.");
  const posts = input.posts.map(requirePostText);
  const created = await clientV2.createThread(posts.map((text) => ({ text, replySettings: input.replySettings })));
  return { posted: true, postIds: created.map(({ id }) => id), posts: created };
}
