import { getChannel } from "../utils/buffer-api";
import { getCurrentOrganizationContext, resolveChannel } from "./shared";

type Input = {
  /**
   * Channel identifier, display name, or service name.
   */
  channel: string;
};

/**
 * Get details for a single Buffer channel.
 */
export default async function tool(input: Input) {
  const { channels } = await getCurrentOrganizationContext();
  const resolution = resolveChannel(channels, input.channel);

  if (!resolution.channel) {
    return {
      error:
        resolution.matches.length > 1
          ? `Multiple channels matched "${input.channel}".`
          : `No Buffer channel matched "${input.channel}".`,
      matches: resolution.matches.map((channel) => ({
        id: channel.id,
        name: channel.displayName || channel.name,
        service: channel.service,
      })),
    };
  }

  const channel = await getChannel(resolution.channel.id);

  return {
    id: channel.id,
    name: channel.name,
    displayName: channel.displayName,
    service: channel.service,
    timezone: channel.timezone,
    isDisconnected: channel.isDisconnected,
    isLocked: channel.isLocked,
    isQueuePaused: channel.isQueuePaused,
    externalLink: channel.externalLink,
    descriptor: channel.descriptor,
    type: channel.type,
  };
}
