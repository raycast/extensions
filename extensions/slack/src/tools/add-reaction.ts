import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  /**
   * The Slack channel ID containing the message. Use a Slack permalink, Get Channels, Read Conversation, Get Channel History, or Search Messages to find it.
   *
   * @example "C12345678"
   */
  channel: string;
  /**
   * The timestamp of the message to react to. This is the `ts` value from a Slack permalink or a read/search tool.
   *
   * @example "1718899200.000100"
   */
  messageTs: string;
  /**
   * The Slack emoji name to add, with or without surrounding colons. Use Get Emojis to discover custom workspace emoji names.
   *
   * @example "thumbsup"
   */
  emoji: string;
};

async function addReaction(input: Input) {
  if (!/^[CDG][A-Z0-9]{8,}$/.test(input.channel)) {
    throw new Error("Invalid Slack conversation ID");
  }

  if (!/^\d+\.\d+$/.test(input.messageTs)) {
    throw new Error("Invalid Slack message timestamp");
  }

  const emoji = input.emoji.trim().replace(/^:+|:+$/g, "");
  if (!emoji || emoji.includes(":")) {
    throw new Error("Emoji must be a Slack emoji name with or without surrounding colons");
  }

  const slackWebClient = getSlackWebClient();
  const response = await slackWebClient.reactions.add({
    channel: input.channel,
    timestamp: input.messageTs,
    name: emoji,
  });

  if (response.error) {
    throw new Error(response.error);
  }

  const permalinkResponse = await slackWebClient.chat.getPermalink({
    channel: input.channel,
    message_ts: input.messageTs,
  });

  return {
    channel: input.channel,
    messageTs: input.messageTs,
    emoji,
    permalink: permalinkResponse.ok ? permalinkResponse.permalink : undefined,
  };
}

export default withSlackClient(addReaction);
