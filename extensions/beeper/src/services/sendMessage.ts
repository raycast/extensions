import { getBeeperDesktop } from "../api";
import { findBestChatMatch } from "./chat-search";

interface SendMessageOptions {
  chatId?: string;
  chatName?: string;
  service?: string;
  message: string;
}

interface SendMessageResult {
  success: boolean;
  sentTo?: string;
  service?: string;
  error?: string;
  suggestions?: string[];
}

export async function sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
  const client = getBeeperDesktop();

  try {
    let chatId = options.chatId;
    let chatName: string | undefined;
    let chatService = "unknown";

    if (!chatId && options.chatName) {
      const result = await findBestChatMatch(options.chatName, options.service);

      if (!result.found) {
        return { success: false, error: result.error, suggestions: result.suggestions };
      }

      chatId = result.match.id;
      chatName = result.match.title;
      chatService = result.match.service;
    }

    if (!chatId) {
      return { success: false, error: "No chat ID or name provided" };
    }

    await client.messages.send(chatId, { text: options.message });

    return {
      success: true,
      sentTo: chatName || chatId,
      service: chatService,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send message";
    return { success: false, error: errorMessage };
  }
}
