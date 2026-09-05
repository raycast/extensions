import type { SlackConversation, SlackMember } from "./slackTypes";
import type { Channel, Group } from "./conversation";
import { toChannel, toGroup } from "./conversation";
import type { CursorPage } from "./pagination";
import { collectPaginatedResults, matchesAllWords } from "./pagination";
import { toUserName } from "./member";

type ConversationSearchOptions = {
  query: string;
  maxResultsPerType: number;
  userNames: ReadonlyMap<string, string>;
  loadConversationsPage: (cursor?: string) => Promise<CursorPage<SlackConversation>>;
  signal?: AbortSignal;
};

type ConversationSearchResult = { type: "channel"; value: Channel } | { type: "group"; value: Group };

export async function loadUserNames(
  loadPage: (cursor?: string) => Promise<CursorPage<SlackMember>>,
  signal?: AbortSignal,
): Promise<ReadonlyMap<string, string>> {
  const userNameEntries = await collectPaginatedResults({
    loadPage,
    transform: toUserName,
    matches: () => true,
    maxResults: Number.POSITIVE_INFINITY,
    scanAllPages: true,
    signal,
  });

  return new Map(userNameEntries);
}

/**
 * Searches Slack's unranked conversation directory and resolves MPIM usernames to visible member names.
 */
export async function searchConversationDirectory({
  query,
  maxResultsPerType,
  userNames,
  loadConversationsPage,
  signal,
}: ConversationSearchOptions): Promise<[Channel[], Group[]]> {
  let channelCount = 0;
  let groupCount = 0;
  const results = await collectPaginatedResults<SlackConversation, ConversationSearchResult>({
    loadPage: loadConversationsPage,
    transform: (conversation) => {
      if (conversation.is_mpim || conversation.name?.startsWith("mpdm-")) {
        const group = toGroup(conversation, userNames);
        return group ? { type: "group", value: group } : undefined;
      }

      const channel = toChannel(conversation);
      return channel ? { type: "channel", value: channel } : undefined;
    },
    matches: (result) => {
      if (result.type === "group") {
        if (groupCount >= maxResultsPerType || !matchesAllWords([result.value.name, result.value.groupName], query)) {
          return false;
        }
        groupCount += 1;
        return true;
      }

      if (channelCount >= maxResultsPerType || !matchesAllWords([result.value.name], query)) {
        return false;
      }
      channelCount += 1;
      return true;
    },
    maxResults: maxResultsPerType * 2,
    scanAllPages: query.trim().length > 0,
    signal,
  });

  const channels: Channel[] = [];
  const groups: Group[] = [];
  for (const result of results) {
    if (result.type === "channel") channels.push(result.value);
    else groups.push(result.value);
  }

  return [channels, groups];
}
