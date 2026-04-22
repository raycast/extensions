import { Action, Tool } from "@raycast/api";
import { createPost } from "../utils/buffer-api";
import { formatDate } from "../utils/helpers";
import {
  describeChannel,
  getCurrentOrganizationContext,
  resolveChannel,
} from "./shared";

type Input = {
  /**
   * Channel identifier, display name, or service name where the post should be created.
   */
  channel: string;
  /**
   * Exact post text to send to Buffer.
   */
  text: string;
  /**
   * Optional ISO 8601 date-time. If omitted, the post is added to the next queue slot.
   */
  scheduledAt?: string;
  /**
   * When true, Buffer stores the post as a draft instead of scheduling it.
   */
  saveToDraft?: boolean;
  /**
   * Optional image URL for image posts.
   */
  imageUrl?: string;
  /**
   * Optional video URL for video posts.
   */
  videoUrl?: string;
  /**
   * Optional thumbnail URL for video posts.
   */
  videoThumbnailUrl?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    style: Action.Style.Regular,
    message: input.saveToDraft
      ? "Create this Buffer draft?"
      : input.scheduledAt
        ? "Create this scheduled Buffer post?"
        : "Add this post to the Buffer queue?",
    info: [
      { name: "Channel", value: input.channel },
      { name: "Scheduled At", value: input.scheduledAt },
      { name: "Save as Draft", value: input.saveToDraft ? "Yes" : "No" },
      { name: "Image URL", value: input.imageUrl },
      { name: "Video URL", value: input.videoUrl },
      { name: "Text", value: input.text },
    ],
  };
};

/**
 * Create a new Buffer text post for a specific channel, either queued automatically or scheduled.
 */
export default async function tool(input: Input) {
  const { activeChannels } = await getCurrentOrganizationContext();
  const resolution = resolveChannel(activeChannels, input.channel);

  if (!resolution.channel) {
    if (resolution.matches.length > 1) {
      return {
        error: `Multiple channels matched "${input.channel}".`,
        matches: resolution.matches.map((channel) => ({
          id: channel.id,
          label: describeChannel(channel),
        })),
      };
    }

    return {
      error: `No active Buffer channel matched "${input.channel}".`,
    };
  }

  const scheduledAt = input.scheduledAt
    ? new Date(input.scheduledAt)
    : undefined;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
    throw new Error("scheduledAt must be a valid ISO 8601 date-time string.");
  }

  const post = await createPost({
    channelId: resolution.channel.id,
    text: input.text.trim(),
    scheduledAt,
    service: resolution.channel.service,
    saveToDraft: input.saveToDraft,
    imageUrl: input.imageUrl,
    videoUrl: input.videoUrl,
    videoThumbnailUrl: input.videoThumbnailUrl,
  });

  return {
    success: true,
    post: {
      id: post.id,
      status: post.status,
      channel: describeChannel(resolution.channel),
      dueAt: post.dueAt,
      dueAtFormatted: formatDate(post.dueAt),
      text: post.text,
    },
    message: input.saveToDraft
      ? `Draft created for ${describeChannel(resolution.channel)}.`
      : scheduledAt
        ? `Scheduled post created for ${describeChannel(resolution.channel)}.`
        : `Post added to the queue for ${describeChannel(resolution.channel)}.`,
  };
}
