import { getPreferenceValues } from "@raycast/api";
import { getBeeperClient, checkBeeperConnection } from "../services/beeper-client";
import { getServiceDisplayName } from "../utils/service-icons";
import { parseService } from "../utils/types";
import { MOCK_MESSAGES } from "../utils/mock-data";

type Input = {
  query: string;
  sender?: "me" | "others";
};

interface MessageResult {
  text: string;
  sender: string;
  service: string;
  timestamp: string;
  chatId: string;
}

export default async function (input: Input): Promise<{ messages: MessageResult[]; count: number }> {
  const { useMockData } = getPreferenceValues<Preferences>();

  if (useMockData) {
    const query = input.query.toLowerCase();
    const messages = MOCK_MESSAGES.filter(
      (message) =>
        message.text.toLowerCase().includes(query) ||
        message.senderName.toLowerCase().includes(query) ||
        message.service.toLowerCase().includes(query),
    )
      .slice(0, 10)
      .map((message) => ({
        text: message.text,
        sender: message.senderName,
        service: getServiceDisplayName(message.service),
        timestamp: message.timestamp,
        chatId: message.chatId,
      }));

    if (messages.length === 0) {
      throw new Error(`No messages found matching "${input.query}"`);
    }

    return { messages, count: messages.length };
  }

  const connectionStatus = await checkBeeperConnection();
  if (!connectionStatus.connected) {
    throw new Error(connectionStatus.error || "Cannot connect to Beeper Desktop");
  }

  const client = await getBeeperClient();

  const searchParams: {
    query: string;
    sender?: "me" | "others";
    includeMuted: boolean;
  } = {
    query: input.query,
    includeMuted: true,
  };

  if (input.sender) {
    searchParams.sender = input.sender;
  }

  const searchCursor = await client.messages.search(searchParams);
  const messages: MessageResult[] = [];

  for await (const msg of searchCursor) {
    const senderName = msg.isSender
      ? "You"
      : msg.senderName || msg.senderID?.split(":")[0]?.replace("@", "") || "Unknown";

    messages.push({
      text: msg.text || "[No text content]",
      sender: senderName,
      service: getServiceDisplayName(parseService(msg.accountID)),
      timestamp: msg.timestamp,
      chatId: msg.chatID,
    });

    if (messages.length >= 10) break;
  }

  if (messages.length === 0) {
    throw new Error(`No messages found matching "${input.query}"`);
  }

  return {
    messages,
    count: messages.length,
  };
}
