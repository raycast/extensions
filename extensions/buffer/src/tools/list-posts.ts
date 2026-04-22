import { getPosts } from "../utils/buffer-api";
import { formatDate, postStatusLabel } from "../utils/helpers";
import {
  describeChannel,
  getCurrentOrganizationContext,
  resolveChannel,
} from "./shared";

type Input = {
  /**
   * Optional channel identifier, display name, or service name used to filter posts.
   */
  channel?: string;
  /**
   * Optional post status filter.
   */
  status?:
    | "draft"
    | "needs_approval"
    | "scheduled"
    | "sending"
    | "sent"
    | "error";
  /**
   * Optional ISO 8601 lower bound for createdAt/dueAt.
   */
  startDate?: string;
  /**
   * Optional ISO 8601 upper bound for createdAt/dueAt.
   */
  endDate?: string;
  /**
   * Maximum number of posts to return.
   */
  limit?: number;
};

/**
 * List Buffer posts with optional status, channel, and date filtering.
 */
export default async function tool(input: Input = {}) {
  const { organization, activeChannels } =
    await getCurrentOrganizationContext();

  let channelIds: string[] | undefined;
  let resolvedChannelLabel: string | undefined;

  if (input.channel) {
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

    channelIds = [resolution.channel.id];
    resolvedChannelLabel = describeChannel(resolution.channel);
  }

  const startDate = input.startDate ? new Date(input.startDate) : undefined;
  const endDate = input.endDate ? new Date(input.endDate) : undefined;

  if (startDate && Number.isNaN(startDate.getTime())) {
    throw new Error("startDate must be a valid ISO 8601 date-time string.");
  }

  if (endDate && Number.isNaN(endDate.getTime())) {
    throw new Error("endDate must be a valid ISO 8601 date-time string.");
  }

  const limit = Math.max(1, Math.min(input.limit ?? 10, 50));
  const connection = await getPosts(organization.id, {
    channelIds,
    status: input.status ? [input.status] : undefined,
    startDate,
    endDate,
    limit,
  });

  const channelMap = new Map(
    activeChannels.map((channel) => [channel.id, channel]),
  );
  const posts = connection.edges.map((edge) => edge.node);

  return {
    organization: organization.name,
    filter: {
      channel: resolvedChannelLabel,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
    },
    totalReturned: posts.length,
    posts: posts.map((post) => {
      const channel = channelMap.get(post.channelId);
      return {
        id: post.id,
        text: post.text,
        status: post.status,
        statusLabel: postStatusLabel(post.status),
        dueAt: post.dueAt,
        dueAtFormatted: formatDate(post.dueAt),
        sentAt: post.sentAt,
        sentAtFormatted: formatDate(post.sentAt),
        assets: post.assets?.length ?? 0,
        channel: channel ? describeChannel(channel) : post.channelId,
      };
    }),
  };
}
