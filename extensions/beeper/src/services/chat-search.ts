import { getBeeperDesktop } from "../api";
import { rankChatMatches, getSuggestionMessage } from "../utils/contact-matching";
import { loadAccountServiceCache } from "../utils/account-service-cache";

export interface ChatMatchCandidate {
  id: string;
  title: string;
  service: string;
  accountID?: string;
  type?: string;
  lastActivity?: string;
  unreadCount?: number;
  isMuted?: boolean;
  isArchived?: boolean;
}

export type ChatSearchResult =
  | { found: true; match: ChatMatchCandidate; allMatches: ChatMatchCandidate[] }
  | { found: false; error: string; suggestions: string[] };

export async function findBestChatMatch(chatName: string, service?: string): Promise<ChatSearchResult> {
  const client = getBeeperDesktop();
  const accountServices = await loadAccountServiceCache();

  const searchCursor = await client.chats.search({
    query: chatName,
    limit: 20,
  });

  const allMatches: ChatMatchCandidate[] = [];

  for await (const chat of searchCursor) {
    const accountInfo = accountServices.get(chat.accountID);
    if (!accountInfo) {
      throw new Error(`Account metadata not loaded for ${chat.accountID}`);
    }

    allMatches.push({
      id: chat.id,
      title: chat.title || "",
      service: accountInfo.serviceLabel,
      accountID: chat.accountID,
      type: chat.type,
      lastActivity: chat.lastActivity,
      unreadCount: chat.unreadCount,
      isMuted: chat.isMuted,
      isArchived: chat.isArchived,
    });
    if (allMatches.length >= 20) break;
  }

  const rankedMatches = rankChatMatches(allMatches, chatName, {
    service,
    minScore: 0.4,
    maxResults: 5,
  });

  if (rankedMatches.length === 0) {
    const allRanked = rankChatMatches(allMatches, chatName, {
      minScore: 0.3,
      maxResults: 3,
    });

    return {
      found: false,
      error: getSuggestionMessage(chatName, allRanked, service),
      suggestions: allRanked.map((m) => m.chat.title),
    };
  }

  return {
    found: true,
    match: rankedMatches[0].chat,
    allMatches,
  };
}
