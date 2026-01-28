import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";
import { isValidChannelId } from "../shared/utils";

type Input = {
  /**
   * The id of the channel to fetch history (eg. messages) for. Use `getChannels` to get the list of channels with their ids.
   */
  text?: string;
  /**
   * Only messages after this ISO 8601 timestamp will be included in results. If ommited, the last 30 messages of the channel will be returned.
   *
   * @example "2025-03-26T00:00:00Z"
   */
  after?: string;
};

async function getChannelIdByChannelName(channelName?: string) {
  if (channelName == null) {
    return undefined;
  }

  const slackWebClient = getSlackWebClient();
  let cursor = null;
  const includedChannelNames: { channelName: string; channelId: string }[] = [];
  do {
    const response = await slackWebClient.conversations.list({
      exclude_archived: true,
      types: "public_channel,private_channel",
      limit: 1000,
      cursor: cursor || undefined,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    if (response.channels) {
      for (let i = 0; i < response.channels?.length ?? 0; i++) {
        const channel = response.channels[i];
        if (channel.id && channel.name) {
          if (channel.name === channelName) {
            /**
             * Returns the channel name as priority if it matches correctly.
             */
            return channel.id;
          } else if (channel.name.includes(channelName!)) {
            /**
             * If the input 'channelName' is included in the channel name, save it to return when there is no exact matching channel name.
             */
            includedChannelNames.push({ channelId: channel.id, channelName: channel.name });
          }
        }
      }

      cursor = response.response_metadata?.next_cursor;
    }
  } while (cursor);

  if (includedChannelNames.length > 0) {
    return includedChannelNames[0].channelId;
  }

  return undefined;
}

async function getChannelHistory(input: Input) {
  const slackWebClient = getSlackWebClient();
  const { after, text }: Input = input;

  const unixTimestamp = after ? Math.floor(new Date(after).getTime() / 1000).toString() : undefined;

  /**
   * Handle cases where the input might be a channel name instead of a channel ID.
   * This happens when users reference channels by name (e.g. 'general') rather than ID.
   * We first check if the input is a valid channel ID, if not we try to find the channel by name.
   */
  const channelId = isValidChannelId(text) ? text : await getChannelIdByChannelName(text);

  if (!channelId) {
    throw new Error("Channel ID not found");
  }

  const messages = await slackWebClient.conversations.history({
    channel: channelId,
    oldest: unixTimestamp,
    limit: 30,
  });

  if (messages.error) {
    throw new Error(messages.error);
  }

  return messages.messages?.map((message) => ({
    text: message.text,
    user: message.user,
    ts: message.ts,
    date: message.ts ? new Date(parseInt(message.ts, 10) * 1000).toISOString() : undefined,
  }));
}

export default withSlackClient(getChannelHistory);
