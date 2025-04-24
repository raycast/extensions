import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

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

  const messages = await slackWebClient.conversations.history({
    channel: input.channelId,
    oldest: unixTimestamp,
    limit: 30,
  });

  if (messages.error) {
    throw new Error(messages.error);
  }

  const response = messages.messages?.map((message) => ({
    text: message.text,
    user: message.user,
    ts: message.ts,
    date: message.ts ? new Date(parseInt(message.ts, 10) * 1000).toISOString() : undefined,
  }));

  return response;
}

export default withSlackClient(getChannelHistory);
