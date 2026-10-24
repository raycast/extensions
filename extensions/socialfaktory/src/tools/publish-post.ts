import { Tool } from "@raycast/api";
import { platformName } from "../lib/format";
import { parseScheduledAt, pickChannel, scheduleProblem, splitThread } from "../lib/publishing";
import { listConnectedChannels, publishPost } from "../lib/socialfaktory";
import type { Channel, WritingPlatform } from "../lib/types";

type Input = {
  /**
   * The ID of the brand to post for, as returned by list-brands (it starts with "brand_").
   */
  brandId: string;
  /**
   * The network to post on: "x" or "linkedin". Defaults to "x".
   */
  platform?: WritingPlatform;
  /**
   * The post exactly as the user approved it. For an X thread, put a line holding only --- between the posts; a LinkedIn post is always posted whole.
   */
  text: string;
  /**
   * When to publish, as an ISO 8601 date and time with the user's time zone offset, for example "2026-10-02T09:00:00-04:00". Leave it out to publish now.
   */
  scheduledAt?: string;
  /**
   * The connected account to post from, as returned in "accounts" by an earlier publish-post answer. Leave it out when the brand has one account on this network.
   */
  channelId?: string;
};

async function resolve(input: Input) {
  const platform = input.platform ?? "x";
  const channels = await listConnectedChannels(input.brandId, platform);
  return { platform, pick: pickChannel(channels, input.channelId) };
}

function account(channel: Channel): string {
  return channel.handle ?? platformName(channel.provider);
}

function readableTime(value: string | undefined): Date | undefined | null {
  try {
    return parseScheduledAt(value);
  } catch {
    return null;
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const at = readableTime(input.scheduledAt);
  if (at === null || (at && scheduleProblem(at, Date.now()))) return undefined;
  const { platform, pick } = await resolve(input);
  if (!("channel" in pick)) return undefined;
  const network = platformName(platform);
  return {
    message: at
      ? `Schedule this on ${network} as ${account(pick.channel)} for ${at.toLocaleString()}?`
      : `Publish this on ${network} as ${account(pick.channel)} now?`,
    info: splitThread(input.text, platform).map((part, index, parts) => ({
      name: parts.length > 1 ? `Post ${index + 1}` : "Post",
      value: part,
    })),
  };
};

export default async function tool(input: Input) {
  const { platform, pick } = await resolve(input);
  const network = platformName(platform);
  if (!("channel" in pick)) {
    if (pick.problem === "none") {
      return {
        status: "no_connected_account",
        message: `This brand has no ${network} account connected. Connect one at https://www.socialfaktory.com, then try again.`,
      };
    }
    return {
      status: "choose_account",
      message: `This brand has several ${network} accounts. Ask the user which one, then call publish-post again with its channelId.`,
      accounts: pick.choices.map((channel) => ({ channelId: channel.id, handle: account(channel) })),
    };
  }

  const post = await publishPost({
    brandId: input.brandId,
    channel: pick.channel,
    parts: splitThread(input.text, platform),
    scheduledAt: parseScheduledAt(input.scheduledAt),
  });
  return {
    status: post.status,
    postId: post.id,
    account: account(pick.channel),
    scheduledAt: post.scheduled_at,
  };
}
