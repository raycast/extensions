import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  /**
   * A Slack conversation ID, user ID, or message permalink. Conversation IDs start with C, D, or G. User IDs start with U or W.
   */
  conversation: string;
  /**
   * Maximum number of messages to return. Defaults to 30 and is capped at 100.
   */
  limit?: number;
  /**
   * Only messages after this ISO 8601 timestamp will be returned.
   */
  after?: string;
};

const CONVERSATION_ID_PATTERN = /^[CDG][A-Z0-9]{8,}$/;
const USER_ID_PATTERN = /^[UW][A-Z0-9]{8,}$/;

function parseSlackPermalink(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  if (!url.hostname.endsWith("slack.com")) {
    return undefined;
  }

  const match = url.pathname.match(/\/archives\/([CDG][A-Z0-9]+)(?:\/p(\d+))?/i);
  if (!match) {
    return undefined;
  }

  const compactTimestamp = match[2];
  const messageTs = compactTimestamp ? `${compactTimestamp.slice(0, -6)}.${compactTimestamp.slice(-6)}` : undefined;

  return { channel: match[1].toUpperCase(), messageTs };
}

async function resolveConversation(value: string): Promise<{ channel: string; messageTs?: string }> {
  const permalink = parseSlackPermalink(value);
  if (permalink) {
    return permalink;
  }

  if (CONVERSATION_ID_PATTERN.test(value)) {
    return { channel: value };
  }

  if (USER_ID_PATTERN.test(value)) {
    const slackWebClient = getSlackWebClient();
    const response = await slackWebClient.conversations.open({ users: value });

    if (response.error) {
      throw new Error(response.error);
    }
    if (!response.channel?.id) {
      throw new Error("Slack did not return a direct message conversation ID");
    }

    return { channel: response.channel.id };
  }

  throw new Error("Conversation must be a Slack conversation ID, user ID, or message permalink");
}

async function readConversation(input: Input) {
  const value = input.conversation.trim();
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 100);
  const oldest = input.after ? Date.parse(input.after) / 1000 : undefined;

  if (input.after && Number.isNaN(oldest)) {
    throw new Error("After must be a valid ISO 8601 timestamp");
  }

  const slackWebClient = getSlackWebClient();
  const { channel, messageTs } = await resolveConversation(value);

  if (messageTs) {
    const response = await slackWebClient.conversations.replies({
      channel,
      ts: messageTs,
      limit,
      oldest: oldest?.toString(),
      inclusive: true,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return {
      channel,
      messageTs,
      messages: response.messages?.map(formatMessage),
      hasMore: response.has_more ?? false,
      nextCursor: response.response_metadata?.next_cursor || undefined,
    };
  }

  const response = await slackWebClient.conversations.history({
    channel,
    limit,
    oldest: oldest?.toString(),
  });

  if (response.error) {
    throw new Error(response.error);
  }

  return {
    channel,
    messages: response.messages?.map(formatMessage),
    hasMore: response.has_more ?? false,
    nextCursor: response.response_metadata?.next_cursor || undefined,
  };
}

function formatMessage(message: {
  text?: string;
  user?: string;
  bot_id?: string;
  bot_profile?: { name?: string };
  username?: string;
  ts?: string;
  thread_ts?: string;
  reply_count?: number;
}) {
  return {
    text: message.text,
    user: message.user ?? message.bot_profile?.name ?? message.username ?? message.bot_id,
    ts: message.ts,
    threadTs: message.thread_ts,
    replyCount: message.reply_count,
    date: message.ts ? new Date(Number.parseFloat(message.ts) * 1000).toISOString() : undefined,
  };
}

export default withSlackClient(readConversation);
