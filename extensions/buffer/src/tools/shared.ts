import { getAccount, getChannels } from "../utils/buffer-api";
import { Channel } from "../utils/types";

export async function getCurrentOrganizationContext() {
  const account = await getAccount();
  const organization = account.organizations[0];

  if (!organization) {
    throw new Error("No Buffer organization found for this account.");
  }

  const channels = await getChannels(organization.id);

  return {
    account,
    organization,
    channels,
    activeChannels: channels.filter(
      (channel) => !channel.isDisconnected && !channel.isLocked,
    ),
  };
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isDefined(value: string | undefined): value is string {
  return Boolean(value);
}

function channelSearchTerms(channel: Channel): string[] {
  return [
    channel.id,
    channel.name,
    channel.displayName,
    channel.service,
    `${channel.displayName || channel.name} (${channel.service})`,
    channel.displayName
      ? `${channel.displayName} ${channel.service}`
      : undefined,
    `${channel.name} ${channel.service}`,
  ]
    .filter(isDefined)
    .map((value) => normalize(value));
}

export function resolveChannel(
  channels: Channel[],
  query: string,
): { channel?: Channel; matches: Channel[] } {
  const normalizedQuery = normalize(query);
  const exactMatches = channels.filter((channel) =>
    channelSearchTerms(channel).includes(normalizedQuery),
  );

  if (exactMatches.length === 1) {
    return { channel: exactMatches[0], matches: exactMatches };
  }

  if (exactMatches.length > 1) {
    return { matches: exactMatches };
  }

  const partialMatches = channels.filter((channel) =>
    channelSearchTerms(channel).some((term) => term.includes(normalizedQuery)),
  );

  if (partialMatches.length === 1) {
    return { channel: partialMatches[0], matches: partialMatches };
  }

  return { matches: partialMatches };
}

export function describeChannel(channel: Channel): string {
  return `${channel.displayName || channel.name} (${channel.service})`;
}
