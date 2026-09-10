import type { SlackConversation, SlackMember } from "./slackTypes";
import type { Channel, Group } from "./conversation";
import { toChannel, toGroup } from "./conversation";
import type { CursorPage } from "./pagination";
import { collectPaginatedResults, matchesAllWords } from "./pagination";
import { searchMemberDirectory } from "./memberSearch";

type ConversationSearchOptions = {
  types?: "channels" | "groups" | "all";
  query: string;
  maxResultsPerType: number;
  userNames?: ReadonlyMap<string, string>;
  loadUserNames?: () => Promise<ReadonlyMap<string, string>>;
  loadConversationsPage: (cursor?: string) => Promise<CursorPage<SlackConversation>>;
  signal?: AbortSignal;
};

type ConversationSearchResult = { type: "channel"; value: Channel } | { type: "group"; value: Group };

type UserNameSearchOptions = {
  query: string;
  maxResults: number;
  loadPage: (cursor?: string) => Promise<CursorPage<SlackMember>>;
  signal?: AbortSignal;
};

/**
 * Finds only the users relevant to the current conversation query. An empty query deliberately skips the user
 * directory so the initial channel list does not depend on, or retain, the full workspace member directory.
 */
export async function searchUserNames({
  query,
  maxResults,
  loadPage,
  signal,
}: UserNameSearchOptions): Promise<ReadonlyMap<string, string>> {
  const { userNames } = await searchMemberDirectory({ query, maxResults, loadPage, signal });
  return userNames;
}

/**
 * Searches Slack's unranked conversation directory and resolves MPIM usernames to visible member names.
 */
export async function searchConversationDirectory({
  query,
  types = "all",
  maxResultsPerType,
  userNames = new Map(),
  loadUserNames,
  loadConversationsPage,
  signal,
}: ConversationSearchOptions): Promise<[Channel[], Group[]]> {
  let channelCount = 0;
  let groupCount = 0;
  const results = await collectPaginatedResults<SlackConversation, ConversationSearchResult>({
    loadPage: async (cursor) => {
      const page = await loadConversationsPage(cursor);
      signal?.throwIfAborted();
      if (
        types !== "channels" &&
        loadUserNames &&
        page.items.some((conversation) => conversation.is_mpim || conversation.name?.startsWith("mpdm-"))
      ) {
        userNames = await loadUserNames();
        loadUserNames = undefined;
      }
      return page;
    },
    transform: (conversation) => {
      if (conversation.is_mpim || conversation.name?.startsWith("mpdm-")) {
        if (types === "channels") return undefined;
        const group = toGroup(conversation, userNames);
        return group ? { type: "group", value: group } : undefined;
      }

      if (types === "groups") return undefined;
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
    maxResults: types === "all" ? maxResultsPerType * 2 : maxResultsPerType,
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
