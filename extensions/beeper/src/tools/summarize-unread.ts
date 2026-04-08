import { getPreferenceValues } from "@raycast/api";
import { getBeeperClient, checkBeeperConnection } from "../services/beeper-client";
import { getServiceDisplayName } from "../utils/service-icons";
import { BeeperService } from "../utils/types";
import { rankChatMatches, getSuggestionMessage } from "../utils/contact-matching";
import { MOCK_CHATS, MOCK_MESSAGES } from "../utils/mock-data";
import { loadAccountServiceCache } from "../utils/account-service-cache";

type Input = {
  chatName?: string;
  service?: string;
};

interface UnreadMessage {
  sender: string;
  text: string;
  timestamp: string;
}

interface UnreadChatSummary {
  chatName: string;
  service: string;
  unreadCount: number;
  chatType: string;
  lastActivity?: string;
}

interface SummarizeResult {
  chatName?: string;
  service?: string;
  unreadCount: number;
  messages?: UnreadMessage[];
  unreadChats?: UnreadChatSummary[];
  totalUnreadCount?: number;
}

export default async function (input: Input): Promise<SummarizeResult> {
  const { useMockData } = getPreferenceValues<Preferences>();

  if (useMockData) {
    return summarizeMockUnread(input);
  }

  const connectionStatus = await checkBeeperConnection();
  if (!connectionStatus.connected) {
    throw new Error(connectionStatus.error || "Cannot connect to Beeper Desktop");
  }

  const client = await getBeeperClient();
  const accountServices = await loadAccountServiceCache();

  if (!input.chatName) {
    return await getAllUnreadChatsSummary(client, input.service, accountServices);
  }

  const searchCursor = await client.chats.search({
    query: input.chatName,
    limit: 20,
  });

  const allMatches: Array<{
    id: string;
    title: string;
    service: BeeperService;
    accountID?: string;
    type?: string;
    lastActivity?: string;
    unreadCount?: number;
    isMuted?: boolean;
    isArchived?: boolean;
  }> = [];

  for await (const chat of searchCursor) {
    const accountInfo = accountServices.get(chat.accountID);
    if (!accountInfo) {
      throw new Error(`Account metadata not loaded for ${chat.accountID}`);
    }

    allMatches.push({
      id: chat.id,
      title: chat.title || "",
      service: accountInfo.service,
      accountID: chat.accountID,
      type: chat.type,
      lastActivity: chat.lastActivity,
      unreadCount: chat.unreadCount,
      isMuted: chat.isMuted,
      isArchived: chat.isArchived,
    });
    if (allMatches.length >= 20) break;
  }

  const rankedMatches = rankChatMatches(allMatches, input.chatName, {
    service: input.service,
    minScore: 0.4,
    maxResults: 5,
  });

  if (rankedMatches.length === 0) {
    const allRanked = rankChatMatches(allMatches, input.chatName, {
      minScore: 0.3,
      maxResults: 3,
    });
    throw new Error(getSuggestionMessage(input.chatName, allRanked, input.service));
  }

  const bestMatch = rankedMatches[0].chat;
  const chatId = bestMatch.id;
  const chatName = bestMatch.title || input.chatName;
  const service = getServiceDisplayName(bestMatch.service);
  const unreadCount = bestMatch.unreadCount || 0;

  if (unreadCount === 0) {
    return {
      chatName,
      service,
      unreadCount: 0,
      messages: [],
    };
  }

  const messageCursor = await client.messages.search({
    query: "",
    chatIDs: [chatId],
    includeMuted: true,
  });

  const unreadMessages: UnreadMessage[] = [];
  let messagesChecked = 0;
  const maxMessagesToCheck = 50;

  for await (const msg of messageCursor) {
    messagesChecked++;

    if (msg.isUnread && !msg.isSender) {
      const senderName = msg.senderName || msg.senderID?.split(":")[0]?.replace("@", "") || "Unknown";

      unreadMessages.push({
        sender: senderName,
        text: msg.text || "[Attachment or media message]",
        timestamp: msg.timestamp,
      });

      if (unreadMessages.length >= unreadCount || unreadMessages.length >= 20) {
        break;
      }
    }

    if (messagesChecked >= maxMessagesToCheck) {
      break;
    }
  }

  unreadMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    chatName,
    service,
    unreadCount,
    messages: unreadMessages,
  };
}

async function getAllUnreadChatsSummary(
  client: Awaited<ReturnType<typeof getBeeperClient>>,
  serviceFilter?: string,
  accountServices?: Awaited<ReturnType<typeof loadAccountServiceCache>>,
): Promise<SummarizeResult> {
  const searchCursor = await client.chats.search({
    limit: 100,
    includeMuted: true,
  });

  const allChats: Array<{
    id: string;
    title: string;
    service: BeeperService;
    type?: string;
    lastActivity?: string;
    unreadCount?: number;
  }> = [];

  for await (const chat of searchCursor) {
    const accountInfo = accountServices?.get(chat.accountID);
    if (!accountInfo) {
      throw new Error(`Account metadata not loaded for ${chat.accountID}`);
    }

    allChats.push({
      id: chat.id,
      title: chat.title || "",
      service: accountInfo.service,
      type: chat.type,
      lastActivity: chat.lastActivity,
      unreadCount: chat.unreadCount,
    });
    if (allChats.length >= 100) break;
  }

  let unreadChats = allChats.filter((chat) => chat.unreadCount && chat.unreadCount > 0);

  if (serviceFilter) {
    const normalizedFilter = serviceFilter.toLowerCase();
    unreadChats = unreadChats.filter((chat) => {
      const chatServiceId = chat.service;
      const chatServiceName = getServiceDisplayName(chatServiceId).toLowerCase();
      return (
        chatServiceId.includes(normalizedFilter) ||
        normalizedFilter.includes(chatServiceId) ||
        chatServiceName.includes(normalizedFilter)
      );
    });
  }

  unreadChats.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));

  const totalUnreadCount = unreadChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);

  const unreadChatsSummary: UnreadChatSummary[] = unreadChats.map((chat) => ({
    chatName: chat.title || "Unknown Chat",
    service: getServiceDisplayName(chat.service),
    unreadCount: chat.unreadCount || 0,
    chatType: chat.type || "single",
    lastActivity: chat.lastActivity,
  }));

  return {
    unreadCount: unreadChats.length,
    totalUnreadCount,
    unreadChats: unreadChatsSummary,
  };
}

function summarizeMockUnread(input: Input): SummarizeResult {
  if (!input.chatName) {
    const unreadChats = MOCK_CHATS.filter((chat) => (chat.unreadCount || 0) > 0);
    return {
      unreadCount: unreadChats.length,
      totalUnreadCount: unreadChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0),
      unreadChats: unreadChats.map((chat) => ({
        chatName: chat.name,
        service: getServiceDisplayName(chat.service),
        unreadCount: chat.unreadCount || 0,
        chatType: chat.type,
        lastActivity: chat.lastMessageAt,
      })),
    };
  }

  const match = MOCK_CHATS.find((chat) => chat.name.toLowerCase().includes(input.chatName!.toLowerCase()));
  if (!match) {
    throw new Error(`No chat found matching "${input.chatName}"`);
  }

  const messages = MOCK_MESSAGES.filter((msg) => msg.chatId === match.id && !msg.isSender).map((msg) => ({
    sender: msg.senderName,
    text: msg.text,
    timestamp: msg.timestamp,
  }));

  return {
    chatName: match.name,
    service: getServiceDisplayName(match.service),
    unreadCount: match.unreadCount || 0,
    messages,
  };
}
