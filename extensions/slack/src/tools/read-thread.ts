import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  /**
   * The Slack channel ID that contains the thread. Use Get Channels, Get Channel History, or Search Messages to find it.
   *
   * @example "C12345678"
   */
  channel: string;
  /**
   * The timestamp of the parent message of the thread. This is the `ts` value from Get Channel History or Search Messages.
   *
   * @example "1718899200.000100"
   */
  threadTs: string;
};

type ThreadMessage = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getSlackWebClient>["conversations"]["replies"]>>["messages"]
>[number];

function getMessageText(message: ThreadMessage) {
  if (message.text) {
    return message.text;
  }

  const attachmentText = message.attachments
    ?.map(
      (attachment) =>
        [attachment.pretext, attachment.title, attachment.text].filter(Boolean).join("\n") || attachment.fallback,
    )
    .filter(Boolean)
    .join("\n\n");
  if (attachmentText) {
    return attachmentText;
  }

  return message.blocks
    ?.map((block) => block.text?.text)
    .filter(Boolean)
    .join("\n");
}

function timestampToIsoDate(ts?: string) {
  if (!ts) {
    return undefined;
  }

  return new Date(Number(ts) * 1000).toISOString();
}

async function readThread(input: Input) {
  const slackWebClient = getSlackWebClient();
  const messages: ThreadMessage[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response = await slackWebClient.conversations.replies({
      channel: input.channel,
      ts: input.threadTs,
      limit: 200,
      cursor,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    messages.push(...(response.messages ?? []));
    cursor = response.response_metadata?.next_cursor;
  } while (cursor);

  return messages.map((message) => ({
    text: getMessageText(message),
    user: message.user ?? message.bot_profile?.name,
    ts: message.ts,
    date: timestampToIsoDate(message.ts),
    isParentMessage: message.ts === input.threadTs,
  }));
}

export default withSlackClient(readThread);
