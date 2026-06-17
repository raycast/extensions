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
  /**
   * The maximum number of thread messages to return. Defaults to 50 and is capped at 100 to avoid returning too much context.
   */
  limit?: number;
  /**
   * The pagination cursor from a previous response. Use this to read more messages when `hasMore` is true.
   */
  cursor?: string;
};

type ThreadMessage = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getSlackWebClient>["conversations"]["replies"]>>["messages"]
>[number] & { username?: string };

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const USER_MENTION_REGEX = /<@([UW][A-Z0-9]+)>/g;

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

function getLimit(limit?: number) {
  if (limit == null || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.floor(limit), 1), MAX_LIMIT);
}

function getUserIdsFromText(text?: string) {
  if (!text) {
    return [];
  }

  return [...text.matchAll(USER_MENTION_REGEX)].map((match) => match[1]).filter(Boolean);
}

async function getUserNameMap(messages: ThreadMessage[]) {
  const slackWebClient = getSlackWebClient();
  const userIds = new Set<string>();

  for (const message of messages) {
    if (message.user) {
      userIds.add(message.user);
    }

    for (const userId of getUserIdsFromText(getMessageText(message))) {
      userIds.add(userId);
    }
  }

  const userNameById = new Map<string, string>();
  let cursor: string | undefined;
  do {
    const response = await slackWebClient.users.list({
      limit: 1000,
      cursor,
    });

    if (response.error) {
      break;
    }

    for (const user of response.members ?? []) {
      if (user.id && userIds.has(user.id)) {
        userNameById.set(
          user.id,
          user.profile?.display_name || user.profile?.real_name || user.real_name || user.name || user.id,
        );
      }
    }

    cursor = response.response_metadata?.next_cursor;
  } while (cursor && userNameById.size < userIds.size);

  return userNameById;
}

function replaceUserMentions(text: string | undefined, userNameById: Map<string, string>) {
  return text?.replace(USER_MENTION_REGEX, (mention, userId: string) => {
    const userName = userNameById.get(userId);

    return userName ? `@${userName}` : mention;
  });
}

async function readThread(input: Input) {
  const slackWebClient = getSlackWebClient();
  const limit = getLimit(input.limit);

  const response = await slackWebClient.conversations.replies({
    channel: input.channel,
    ts: input.threadTs,
    limit,
    cursor: input.cursor,
  });

  if (response.error) {
    throw new Error(response.error);
  }

  const nextCursor = response.response_metadata?.next_cursor || undefined;
  const hasMore = Boolean(response.has_more || nextCursor);
  const messages = (response.messages ?? []) as ThreadMessage[];
  const userNameById = await getUserNameMap(messages);

  return {
    messages: messages.map((message) => ({
      text: replaceUserMentions(getMessageText(message), userNameById),
      // Incoming webhooks set `username` when `user` and `bot_profile` are absent.
      user: message.user
        ? userNameById.get(message.user) || message.user
        : (message.bot_profile?.name ?? message.username),
      ts: message.ts,
      date: timestampToIsoDate(message.ts),
      isParentMessage: message.ts === input.threadTs,
    })),
    hasMore,
    nextCursor,
    returnedCount: response.messages?.length ?? 0,
    limit,
  };
}

export default withSlackClient(readThread);
