import { getPreferenceValues } from "@raycast/api";
import { assertBeeperConnection, getBeeperDesktop } from "../api";
import { MOCK_CHATS, MOCK_MESSAGES } from "../utils/mock-data";
import { loadAccountServiceCache } from "../utils/account-service-cache";
import { findBestChatMatch } from "../services/chat-search";
import { getSenderDisplayName } from "../utils/helpers";

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

  await assertBeeperConnection();

  const client = getBeeperDesktop();

  if (!input.chatName) {
    const accountServices = await loadAccountServiceCache();
    return await getAllUnreadChatsSummary(client, input.service, accountServices);
  }

  const searchResult = await findBestChatMatch(input.chatName, input.service);
  if (!searchResult.found) {
    throw new Error(searchResult.error);
  }

  const chatId = searchResult.match.id;
  const chatName = searchResult.match.title || input.chatName;
  const service = searchResult.match.service;
  const unreadCount = searchResult.match.unreadCount || 0;

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
      unreadMessages.push({
        sender: getSenderDisplayName(msg),
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
  client: ReturnType<typeof getBeeperDesktop>,
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
    service: string;
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
      service: accountInfo.serviceLabel,
      type: chat.type,
      lastActivity: chat.lastActivity,
      unreadCount: chat.unreadCount,
    });
    if (allChats.length >= 100) break;
  }

  let unreadChats = allChats.filter((chat) => chat.unreadCount && chat.unreadCount > 0);

  if (serviceFilter) {
    const normalizedFilter = serviceFilter.toLowerCase();
    unreadChats = unreadChats.filter((chat) => chat.service.toLowerCase().includes(normalizedFilter));
  }

  unreadChats.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));

  const totalUnreadCount = unreadChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);

  const unreadChatsSummary: UnreadChatSummary[] = unreadChats.map((chat) => ({
    chatName: chat.title || "Unknown Chat",
    service: chat.service,
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
        service: chat.service,
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
    service: match.service,
    unreadCount: match.unreadCount || 0,
    messages,
  };
}
