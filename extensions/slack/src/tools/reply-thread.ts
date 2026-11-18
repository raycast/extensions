import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";
import { getAiMessageBlocks } from "./message-signature";

type Input = {
  /**
   * The Slack channel ID that contains the thread. Use Get Channels, Get Channel History, or Search Messages to find it.
   *
   * @example "C12345678"
   */
  channel: string;
  /**
   * The timestamp of the parent message to reply to. This is the `ts` value from Get Channel History, Search Messages, or Read Thread.
   *
   * @example "1718899200.000100"
   */
  threadTs: string;
  /**
   * The text to post as a reply in the thread. Standard Markdown is supported, including headings, lists, task lists, tables, links, block quotes, and code blocks. Use Slack IDs for native mentions, such as `<@U12345678>` for a person and `<#C12345678>` for a channel.
   */
  text: string;
  /**
   * Also send the reply to the channel. Use this sparingly when the reply is important enough for everyone in the channel to see.
   */
  replyBroadcast?: boolean;
};

async function replyThread(input: Input) {
  if (!/^[CDG][A-Z0-9]{8,}$/.test(input.channel)) {
    throw new Error("Invalid Slack conversation ID");
  }

  if (!/^\d+\.\d+$/.test(input.threadTs)) {
    throw new Error("Invalid Slack thread timestamp");
  }

  const text = input.text.trim();
  if (!text) {
    throw new Error("Reply text cannot be empty");
  }

  const slackWebClient = getSlackWebClient();
  const blocks = getAiMessageBlocks(text);
  const message = blocks ? { channel: input.channel, text, blocks } : { channel: input.channel, text };
  const thread = input.replyBroadcast
    ? { thread_ts: input.threadTs, reply_broadcast: true as const }
    : { thread_ts: input.threadTs, reply_broadcast: false as const };
  const response = await slackWebClient.chat.postMessage({ ...message, ...thread });

  if (response.error) {
    throw new Error(response.error);
  }

  return {
    channel: response.channel,
    threadTs: input.threadTs,
    ts: response.ts,
    text: response.message?.text ?? text,
    replyBroadcast: input.replyBroadcast ?? false,
  };
}

export default withSlackClient(replyThread);
