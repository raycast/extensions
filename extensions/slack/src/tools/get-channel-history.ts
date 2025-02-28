import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

async function getChannelHistory(input: {
  /**
   * The id of the channel to fetch history (eg. messages) for. Use `getChannels` to get the list of channels with their ids.
   */
  channelId: string;
  /**
   * Only messages after this Unix timestamp will be included in results. If ommited, the last 30 messages of the channel will be returned.
   *
   * Example: "1234567890.123456"
   */
  after?: string;
}) {
  const slackWebClient = getSlackWebClient();

  const messages = await slackWebClient.conversations.history({
    channel: input.channelId,
    oldest: input.after,
    limit: 30,
  });

  if (messages.error) {
    throw new Error(messages.error);
  }

  return messages.messages;
}

export default withSlackClient(getChannelHistory);
