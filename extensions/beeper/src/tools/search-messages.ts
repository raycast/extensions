import { getPreferenceValues } from "@raycast/api";
import { assertBeeperConnection, getBeeperDesktop } from "../api";
import { MOCK_MESSAGES } from "../utils/mock-data";
import { getSenderDisplayName } from "../utils/helpers";
import { loadAccountServiceCache } from "../utils/account-service-cache";

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
        service: message.service,
        timestamp: message.timestamp,
        chatId: message.chatId,
      }));

    if (messages.length === 0) {
      throw new Error(`No messages found matching "${input.query}"`);
    }

    return { messages, count: messages.length };
  }

  await assertBeeperConnection();

  const client = getBeeperDesktop();
  const accountServices = await loadAccountServiceCache();

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
    const accountInfo = accountServices.get(msg.accountID);
    messages.push({
      text: msg.text || "[No text content]",
      sender: getSenderDisplayName(msg),
      service: accountInfo?.serviceLabel || msg.accountID,
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
