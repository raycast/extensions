import { describeChannel, getCurrentOrganizationContext } from "./shared";

/**
 * List the active Buffer channels available to the current account.
 */
export default async function tool() {
  const { organization, activeChannels } =
    await getCurrentOrganizationContext();

  return {
    organization: {
      id: organization.id,
      name: organization.name,
    },
    totalChannels: activeChannels.length,
    channels: activeChannels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      displayName: channel.displayName,
      service: channel.service,
      timezone: channel.timezone,
      label: describeChannel(channel),
    })),
  };
}
