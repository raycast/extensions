import { getPreferenceValues } from "@raycast/api";
import { assertBeeperConnection, getBeeperDesktop } from "../api";
import { MOCK_CHATS, MOCK_MESSAGES } from "../utils/mock-data";
import { findBestChatMatch } from "../services/chat-search";
import { getSenderDisplayName } from "../utils/helpers";

type Input = {
  chatName: string;
  service?: string;
  question?: string;
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
  fallbackToMostRecentDay?: boolean;
}

export default async function (input: Input): Promise<SummarizeMessagesResult> {
  const { useMockData } = getPreferenceValues<Preferences>();

  if (useMockData) {
    return summarizeMockMessages(input);
  }

  await assertBeeperConnection();

  const client = getBeeperDesktop();

  const searchResult = await findBestChatMatch(input.chatName, input.service);
  if (!searchResult.found) {
    throw new Error(searchResult.error);
  }

  const chatId = searchResult.match.id;
  const chatName = searchResult.match.title || input.chatName;
  const service = searchResult.match.service;

  const now = new Date();
  const effectiveTimeRange = input.timeRange || "today";
  let startDate: Date;
  let dateRangeLabel: string;

  if (effectiveTimeRange === "week") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    dateRangeLabel = `Past week (${startDate.toLocaleDateString()} - ${now.toLocaleDateString()})`;
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dateRangeLabel = `Today (${startDate.toLocaleDateString()})`;
  }
  const dateAfter = startDate.toISOString();

  const messageCursor = await client.messages.search({
    query: "",
    chatIDs: [chatId],
    dateAfter,
    includeMuted: true,
  });

  let messages: Message[] = [];
  const maxMessages = 50;

  for await (const msg of messageCursor) {
    messages.push({
      sender: getSenderDisplayName(msg),
      text: msg.text || "[Attachment or media message]",
      timestamp: msg.timestamp,
      isFromMe: msg.isSender || false,
    });

    if (messages.length >= maxMessages) break;
  }

  let fallbackToMostRecentDay = false;
  if (messages.length === 0) {
    const recentMessagesCursor = await client.messages.search({
      query: "",
      chatIDs: [chatId],
      includeMuted: true,
    });

    const recentMessages: Message[] = [];
    for await (const msg of recentMessagesCursor) {
      recentMessages.push({
        sender: getSenderDisplayName(msg),
        text: msg.text || "[Attachment or media message]",
        timestamp: msg.timestamp,
        isFromMe: msg.isSender || false,
      });

      if (recentMessages.length >= maxMessages) break;
    }

    if (recentMessages.length > 0) {
      const sortedRecent = recentMessages.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      const mostRecentDate = new Date(sortedRecent[0].timestamp);
      const mostRecentDayStart = new Date(
        mostRecentDate.getFullYear(),
        mostRecentDate.getMonth(),
        mostRecentDate.getDate(),
      );

      messages = sortedRecent.filter((msg) => {
        const msgDate = new Date(msg.timestamp);
        return msgDate >= mostRecentDayStart;
      });

      fallbackToMostRecentDay = true;
      dateRangeLabel = `Most recent day (${mostRecentDayStart.toLocaleDateString()}) - no messages in requested time range`;
    }
  }

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

function summarizeMockMessages(input: Input): SummarizeMessagesResult {
  const match = MOCK_CHATS.find((chat) => chat.name.toLowerCase().includes(input.chatName.toLowerCase()));
  if (!match) {
    throw new Error(`No chat found matching "${input.chatName}"`);
  }

  const effectiveTimeRange = input.timeRange || "today";
  const now = new Date();
  const dayLimit = effectiveTimeRange === "week" ? 7 : 1;
  const threshold = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayLimit + 1);

  const messages = MOCK_MESSAGES.filter(
    (message) => message.chatId === match.id && new Date(message.timestamp) >= threshold,
  )
    .slice(0, 50)
    .map((message) => ({
      sender: message.isSender ? "You" : message.senderName,
      text: message.text,
      timestamp: message.timestamp,
      isFromMe: message.isSender,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const dateRange =
    effectiveTimeRange === "week"
      ? `Past week (${threshold.toLocaleDateString()} - ${now.toLocaleDateString()})`
      : `Today (${now.toLocaleDateString()})`;

  return {
    chatName: match.name,
    service: match.service,
    messageCount: messages.length,
    messages,
    question: input.question,
    dateRange,
    timeRange: effectiveTimeRange,
  };
}
