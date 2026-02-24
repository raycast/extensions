import { getBeeperClient, checkBeeperConnection } from "../services/beeper-client";
import { getServiceDisplayName } from "../utils/service-icons";
import { parseService } from "../utils/types";
import { rankChatMatches, getSuggestionMessage } from "../utils/contact-matching";

type Input = {
  /**
   * Optional: The name of the chat to summarize unread messages from.
   * Can be a person's name like "John Smith", partial name like "John",
   * nickname like "mom", or group name like "Family Group".
   * If not provided, returns a summary list of ALL chats with unread messages.
   */
  chatName?: string;
  /**
   * Optional: specific messaging service to filter by.
   * Examples: "whatsapp", "telegram", "signal", "discord", "slack", "imessage"
   * If not specified, will find the first matching chat across all services.
   */
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
  /** When chatName is not provided, this contains all chats with unread messages */
  unreadChats?: UnreadChatSummary[];
  /** Total unread messages across all chats (when chatName is not provided) */
  totalUnreadCount?: number;
}

/**
 * Gets unread messages from a specific chat for AI summarization.
 * If chatName is provided, searches for the chat and fetches its unread messages.
 * If chatName is not provided, returns a summary list of all chats with unread messages.
 */
export default async function (input: Input): Promise<SummarizeResult> {
  // 1. Check Beeper connection
  const connectionStatus = await checkBeeperConnection();
  if (!connectionStatus.connected) {
    throw new Error(connectionStatus.error || "Cannot connect to Beeper Desktop");
  }

  const client = await getBeeperClient();

  // 2. If no chatName provided, return summary of all chats with unread messages
  if (!input.chatName) {
    return await getAllUnreadChatsSummary(client, input.service);
  }

  // 3. Search for specific chat by name
  const searchCursor = await client.chats.search({
    query: input.chatName,
    limit: 20,
  });

  // Collect results from cursor
  const allMatches: Array<{
    id: string;
    title: string;
    network: string;
    accountID?: string;
    type?: string;
    lastActivity?: string;
    unreadCount?: number;
    isMuted?: boolean;
    isArchived?: boolean;
  }> = [];

  for await (const chat of searchCursor) {
    allMatches.push(chat);
    if (allMatches.length >= 20) break;
  }

  // 3. Rank matches using similarity scoring
  const rankedMatches = rankChatMatches(allMatches, input.chatName, {
    service: input.service,
    minScore: 0.4,
    maxResults: 5,
  });

  if (rankedMatches.length === 0) {
    // Get suggestions from all matches for better error message
    const allRanked = rankChatMatches(allMatches, input.chatName, {
      minScore: 0.3,
      maxResults: 3,
    });
    throw new Error(getSuggestionMessage(input.chatName, allRanked, input.service));
  }

  // Use best match
  const bestMatch = rankedMatches[0].chat;
  const chatId = bestMatch.id;
  const chatName = bestMatch.title || input.chatName;
  const service = getServiceDisplayName(parseService(bestMatch.network));
  const unreadCount = bestMatch.unreadCount || 0;

  // 4. Check if there are unread messages
  if (unreadCount === 0) {
    return {
      chatName,
      service,
      unreadCount: 0,
      messages: [],
    };
  }

  // 5. Fetch recent messages for this chat
  // We need to fetch enough messages to find the unread ones
  const messageCursor = await client.messages.search({
    query: "", // Empty query to get all messages
    chatIDs: [chatId],
    includeMuted: true,
  });

  // 6. Collect messages and filter for unread
  const unreadMessages: UnreadMessage[] = [];
  let messagesChecked = 0;
  const maxMessagesToCheck = 50; // Limit to prevent too many API calls

  for await (const msg of messageCursor) {
    messagesChecked++;

    // Check if message is unread (from others, not from self)
    if (msg.isUnread && !msg.isSender) {
      const senderName = msg.senderName || msg.senderID?.split(":")[0]?.replace("@", "") || "Unknown";

      unreadMessages.push({
        sender: senderName,
        text: msg.text || "[Attachment or media message]",
        timestamp: msg.timestamp,
      });

      // Stop if we've collected enough unread messages
      if (unreadMessages.length >= unreadCount || unreadMessages.length >= 20) {
        break;
      }
    }

    // Safety limit to prevent infinite loops
    if (messagesChecked >= maxMessagesToCheck) {
      break;
    }
  }

  // Sort messages by timestamp (oldest first for chronological reading)
  unreadMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    chatName,
    service,
    unreadCount,
    messages: unreadMessages,
  };
}

/**
 * Gets a summary of all chats with unread messages.
 * Returns chat names, services, and unread counts sorted by unread count.
 */
async function getAllUnreadChatsSummary(
  client: Awaited<ReturnType<typeof getBeeperClient>>,
  serviceFilter?: string,
): Promise<SummarizeResult> {
  // Fetch recent chats (get a good sample to find unread ones)
  const searchCursor = await client.chats.search({
    limit: 100,
    includeMuted: true,
  });

  // Collect all chats
  const allChats: Array<{
    id: string;
    title: string;
    network: string;
    type?: string;
    lastActivity?: string;
    unreadCount?: number;
  }> = [];

  for await (const chat of searchCursor) {
    allChats.push(chat);
    if (allChats.length >= 100) break;
  }

  // Filter for chats with unread messages
  let unreadChats = allChats.filter((chat) => chat.unreadCount && chat.unreadCount > 0);

  // Apply service filter if provided
  if (serviceFilter) {
    const normalizedFilter = serviceFilter.toLowerCase();
    unreadChats = unreadChats.filter((chat) => {
      const chatService = chat.network?.toLowerCase() || "";
      return chatService.includes(normalizedFilter) || normalizedFilter.includes(chatService);
    });
  }

  // Sort by unread count (highest first)
  unreadChats.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));

  // Calculate total unread count
  const totalUnreadCount = unreadChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);

  // Transform to summary format
  const unreadChatsSummary: UnreadChatSummary[] = unreadChats.map((chat) => ({
    chatName: chat.title || "Unknown Chat",
    service: getServiceDisplayName(parseService(chat.network)),
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
