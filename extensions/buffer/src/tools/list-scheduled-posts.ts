import { getScheduledPosts } from "../utils/buffer-api";
import { formatDate } from "../utils/helpers";
import {
  describeChannel,
  getCurrentOrganizationContext,
  resolveChannel,
} from "./shared";

type Input = {
  /**
   * Optional channel identifier, display name, or service name used to filter scheduled posts.
   */
  channel?: string;
  /**
   * Maximum number of posts to return.
   */
  limit?: number;
};

/**
 * List upcoming scheduled Buffer posts, optionally filtered by channel.
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

  const connection = await getScheduledPosts(organization.id, channelIds);
  const limit = Math.max(1, Math.min(input.limit ?? 10, 50));
  const posts = connection.edges.map((edge) => edge.node).slice(0, limit);
  const channelMap = new Map(
    activeChannels.map((channel) => [channel.id, channel]),
  );

  return {
    organization: organization.name,
    filter: resolvedChannelLabel,
    totalReturned: posts.length,
    posts: posts.map((post) => {
      const channel = channelMap.get(post.channelId);
      return {
        id: post.id,
        text: post.text,
        dueAt: post.dueAt,
        dueAtFormatted: formatDate(post.dueAt),
        status: post.status,
        channel: channel ? describeChannel(channel) : post.channelId,
      };
    }),
  };
}
