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
   * The text to post as a reply in the thread.
   */
  text: string;
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
  const response = await slackWebClient.chat.postMessage({
    channel: input.channel,
    thread_ts: input.threadTs,
    text,
    blocks: getAiMessageBlocks(text),
  });

  if (response.error) {
    throw new Error(response.error);
  }

  return {
    channel: response.channel,
    threadTs: input.threadTs,
    ts: response.ts,
    text: response.message?.text ?? text,
  };
}

export default withSlackClient(replyThread);
