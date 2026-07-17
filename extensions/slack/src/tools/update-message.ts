import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";
import { getAiMessageBlocks } from "./message-signature";

type Input = {
  /**
   * The Slack channel ID containing the message. Use a Slack permalink, Get Channels, Read Conversation, Get Channel History, or Search Messages to find it.
   *
   * @example "C12345678"
   */
  channel: string;
  /**
   * The timestamp of the message to edit. This is the `ts` value from a Slack permalink or a read/search tool.
   *
   * @example "1718899200.000100"
   */
  messageTs: string;
  /**
   * The complete replacement text for the message. Slack mrkdwn is supported.
   */
  text: string;
};

async function updateMessage(input: Input) {
  if (!/^[CDG][A-Z0-9]{8,}$/.test(input.channel)) {
    throw new Error("Invalid Slack conversation ID");
  }

  if (!/^\d+\.\d+$/.test(input.messageTs)) {
    throw new Error("Invalid Slack message timestamp");
  }

  const text = input.text.trim();
  if (!text) {
    throw new Error("Message text cannot be empty");
  }

  const slackWebClient = getSlackWebClient();
  const response = await slackWebClient.chat.update({
    channel: input.channel,
    ts: input.messageTs,
    text,
    blocks: getAiMessageBlocks(text, "updated") ?? [],
  });

  if (response.error) {
    throw new Error(response.error);
  }

  const permalinkResponse = await slackWebClient.chat.getPermalink({
    channel: input.channel,
    message_ts: input.messageTs,
  });

  return {
    channel: response.channel ?? input.channel,
    ts: response.ts ?? input.messageTs,
    text: response.text ?? text,
    permalink: permalinkResponse.ok ? permalinkResponse.permalink : undefined,
  };
}

export default withSlackClient(updateMessage);
