import { Tool } from "@raycast/api";
import { clientV2, ReplySettings, ThreadPublishError } from "../v2/lib/twitterapi_v2";
import { requirePostId, requirePostText } from "./inputs";

type Input = {
  /** Exact ordered text for each public post in the thread. */
  posts: string[];
  /** Resume a partially published thread after this confirmed post ID; provide only remaining posts. */
  replyToPostId?: string;
  /** Who can reply to each post in the thread. */
  replySettings?: ReplySettings;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Publish this ${input.posts.length}-post thread on X?`,
  info: [
    ...(input.replyToPostId ? [{ name: "Continue After Post", value: input.replyToPostId }] : []),
    ...input.posts.map((post, index) => ({ name: `Post ${index + 1}`, value: post.trim() })),
  ],
});

/** Publish an ordered thread, with each new post replying to the preceding post. */
export default async function postThread(input: Input) {
  if (input.posts.length < (input.replyToPostId ? 1 : 2))
    throw new Error("A thread needs at least two posts. Use post for a single post.");
  if (input.posts.length > 25) throw new Error("Publish at most 25 posts in one thread.");
  const posts = input.posts.map(requirePostText);
  const replyToPostId = input.replyToPostId ? requirePostId(input.replyToPostId) : undefined;
  try {
    const created = await clientV2.createThread(
      posts.map((text, index) => ({
        text,
        replySettings: input.replySettings,
        replyToPostId: index === 0 ? replyToPostId : undefined,
      })),
    );
    return { posted: true, postIds: created.map(({ id }) => id), posts: created };
  } catch (error) {
    if (!(error instanceof ThreadPublishError) || !error.created.length) throw error;
    return {
      posted: false,
      postIds: error.created.map(({ id }) => id),
      remainingPosts: posts.slice(error.created.length),
      replyToPostId: error.created.at(-1)!.id,
      error: error.message,
    };
  }
}
