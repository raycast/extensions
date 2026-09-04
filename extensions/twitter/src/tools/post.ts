import { Tool } from "@raycast/api";
import { clientV2, ReplySettings } from "../v2/lib/twitterapi_v2";

type Input = {
  /** Exact text to post publicly on X. May be empty only when mediaPaths is provided; maximum 280 characters. */
  text?: string;
  /** Absolute local paths of up to four images, one GIF, or one video to upload and attach. */
  mediaPaths?: string[];
  /** Numeric ID of an existing X post to quote. Quote posting requires X Enterprise API access. */
  quotePostId?: string;
  /** Two to four poll options. A poll cannot be combined with media or a quote post. */
  pollOptions?: string[];
  /** Poll duration from 5 to 10,080 minutes. Required with pollOptions. */
  pollDurationMinutes?: number;
  /** Who can reply to the post. */
  replySettings?: ReplySettings;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Publish this post on X?",
  info: [
    { name: "Post", value: input.text?.trim() || "Media only" },
    { name: "Media", value: input.mediaPaths?.join("\n") || "None" },
    { name: "Quote Post", value: input.quotePostId?.trim() || "None" },
    { name: "Poll", value: input.pollOptions?.join(" / ") || "None" },
    { name: "Who Can Reply", value: input.replySettings ?? "everyone" },
  ],
});

/** Publish a structured post to the authenticated user's X account after user confirmation. */
export default async function post(input: Input) {
  const text = input.text?.trim() ?? "";
  const created = await clientV2.createPost({
    text,
    mediaPaths: input.mediaPaths,
    quotePostId: input.quotePostId,
    poll:
      input.pollOptions || input.pollDurationMinutes !== undefined
        ? { options: input.pollOptions ?? [], durationMinutes: input.pollDurationMinutes ?? 0 }
        : undefined,
    replySettings: input.replySettings,
  });
  return { posted: true, postId: created.id, text: created.text };
}
