import {getSlackWebClient} from "../shared/client/WebClient";
import {withSlackClient} from "../shared/withSlackClient";
import {isValidChannelId} from "../shared/utils";

async function getChannelIdByChannelName(channelName: string) {
  const slackWebClient = getSlackWebClient();
  let cursor = null;

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
        if (channel.name?.includes(channelName)) {
          return channel.id
        }
      }

      cursor = response.response_metadata?.next_cursor;
    }

  } while (cursor);

  return undefined;
}

async function getChannelHistory(input: {
  /**
   * The id of the channel to fetch history (eg. messages) for. Use `getChannels` to get the list of channels with their ids.
   */
  channelId: string;
  /**
   * Only messages after this ISO 8601 timestamp will be included in results. If ommited, the last 30 messages of the channel will be returned.
   *
   * @example "2025-03-26T00:00:00Z"
   */
  after?: string;
}) {
  const slackWebClient = getSlackWebClient();

  const unixTimestamp = input.after ? Math.floor(new Date(input.after).getTime() / 1000).toString() : undefined;

  /**
   * There are cases where the channelId is not the channelId, so I will add that condition.
   * To test for the opposite condition, if you ask @ask slack to 'Summarize the messages posted on May 12th in the #general channel,' this will occur.
   * If you ask again, you will run getChannels, so the error will occur only the first time.
   */
  const channelId = await (async () => {
    if (isValidChannelId(input.channelId)) {
      return input.channelId;
    } else {
      return await getChannelIdByChannelName(input.channelId)
    }
  })()

  if (!channelId) {
    throw new Error('Not found Channel Id');
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
