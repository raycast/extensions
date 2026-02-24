import { getBeeperClient, checkBeeperConnection } from "../services/beeper-client";
import { getServiceDisplayName } from "../utils/service-icons";
import { parseService } from "../utils/types";
import { rankChatMatches, getSuggestionMessage } from "../utils/contact-matching";

type Input = {
  /**
   * The name of the chat to get messages from.
   * Can be a person's name like "John Smith", partial name like "John",
   * nickname like "mom", or group name like "Family Group".
   */
  chatName: string;
  /**
   * Optional: specific messaging service to filter by.
   * Examples: "whatsapp", "telegram", "signal", "discord", "slack", "imessage"
   * If not specified, will find the first matching chat across all services.
   */
  service?: string;
  /**
   * Optional: a specific question or topic to focus on when summarizing.
   * Examples: "what were they talking about?", "any plans mentioned?", "what did they decide?"
   * If provided, you should focus your summary on answering this question.
   */
  question?: string;
  /**
   * Optional: time range for messages to summarize.
   * Use "today" to get today's messages only, or "week" to get the past 7 days.
   * Defaults to "today" if not specified.
   */
  timeRange?: "today" | "week";
};

interface Message {
  sender: string;
  text: string;
  timestamp: string;
  isFromMe: boolean;
}

interface SummarizeMessagesResult {
  chatName: string;
  service: string;
  messageCount: number;
  messages: Message[];
  question?: string;
  dateRange: string;
  timeRange: "today" | "week";
  /** If true, no messages were found in the requested time range, so we fell back to the most recent day of messages */
  fallbackToMostRecentDay?: boolean;
}

/**
 * Gets messages from a specific chat for AI summarization.
 * Supports time ranges: "today" (default) or "week" (past 7 days).
 * Can optionally focus on a specific question or topic.
 * Useful for catching up on conversations or answering questions like
 * "what have they been talking about?" or "any plans for tonight?"
 */
export default async function (input: Input): Promise<SummarizeMessagesResult> {
  // 1. Check Beeper connection
  const connectionStatus = await checkBeeperConnection();
  if (!connectionStatus.connected) {
    throw new Error(connectionStatus.error || "Cannot connect to Beeper Desktop");
  }

  const client = await getBeeperClient();

  // 2. Search for chat by name
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

  // 4. Calculate date range based on timeRange parameter
  const now = new Date();
  const effectiveTimeRange = input.timeRange || "today";
  let startDate: Date;
  let dateRangeLabel: string;

  if (effectiveTimeRange === "week") {
    // Start of 7 days ago
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    dateRangeLabel = `Past week (${startDate.toLocaleDateString()} - ${now.toLocaleDateString()})`;
  } else {
    // Start of today (default)
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dateRangeLabel = `Today (${startDate.toLocaleDateString()})`;
  }
  const dateAfter = startDate.toISOString();

  // 5. Fetch messages for this chat
  const messageCursor = await client.messages.search({
    query: "", // Empty query to get all messages
    chatIDs: [chatId],
    dateAfter: dateAfter,
    includeMuted: true,
  });

  // 6. Collect all messages from the time range
  let messages: Message[] = [];
  const maxMessages = 50; // Reasonable limit for summarization

  for await (const msg of messageCursor) {
    const senderName = msg.isSender
      ? "You"
      : msg.senderName || msg.senderID?.split(":")[0]?.replace("@", "") || "Unknown";

    messages.push({
      sender: senderName,
      text: msg.text || "[Attachment or media message]",
      timestamp: msg.timestamp,
      isFromMe: msg.isSender || false,
    });

    if (messages.length >= maxMessages) break;
  }

  // 7. If no messages found, fall back to most recent day of messages
  let fallbackToMostRecentDay = false;
  if (messages.length === 0) {
    // Fetch recent messages without date filter to find the most recent day
    const recentMessagesCursor = await client.messages.search({
      query: "",
      chatIDs: [chatId],
      includeMuted: true,
    });

    const recentMessages: Message[] = [];
    for await (const msg of recentMessagesCursor) {
      const senderName = msg.isSender
        ? "You"
        : msg.senderName || msg.senderID?.split(":")[0]?.replace("@", "") || "Unknown";

      recentMessages.push({
        sender: senderName,
        text: msg.text || "[Attachment or media message]",
        timestamp: msg.timestamp,
        isFromMe: msg.isSender || false,
      });

      if (recentMessages.length >= maxMessages) break;
    }

    if (recentMessages.length > 0) {
      // Find the most recent message's date
      const sortedRecent = recentMessages.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      const mostRecentDate = new Date(sortedRecent[0].timestamp);
      const mostRecentDayStart = new Date(
        mostRecentDate.getFullYear(),
        mostRecentDate.getMonth(),
        mostRecentDate.getDate(),
      );

      // Filter to just messages from that day
      messages = sortedRecent.filter((msg) => {
        const msgDate = new Date(msg.timestamp);
        return msgDate >= mostRecentDayStart;
      });

      fallbackToMostRecentDay = true;
      dateRangeLabel = `Most recent day (${mostRecentDayStart.toLocaleDateString()}) - no messages in requested time range`;
    }
  }

  // Sort messages by timestamp (oldest first for chronological reading)
  messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    chatName,
    service,
    messageCount: messages.length,
    messages,
    question: input.question,
    dateRange: dateRangeLabel,
    timeRange: effectiveTimeRange,
    ...(fallbackToMostRecentDay && { fallbackToMostRecentDay: true }),
  };
}
