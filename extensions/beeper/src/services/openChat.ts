import { closeMainWindow } from "@raycast/api";
import { getBeeperDesktop } from "../api";
import { BeeperChat } from "../utils/types";
import { findBestChatMatch } from "./chat-search";

interface OpenChatOptions {
  chatId?: string;
  chatName?: string;
  service?: string;
}

interface OpenChatResult {
  success: boolean;
  chat?: BeeperChat;
  error?: string;
  suggestions?: string[];
}

export async function openChat(options: OpenChatOptions): Promise<OpenChatResult> {
  const client = getBeeperDesktop();

  try {
    let chatId = options.chatId;
    let foundChat: BeeperChat | undefined;

    if (!chatId && options.chatName) {
      const result = await findBestChatMatch(options.chatName, options.service);

      if (!result.found) {
        return { success: false, error: result.error, suggestions: result.suggestions };
      }

      const bestMatch = result.match;
      chatId = bestMatch.id;
      foundChat = {
        id: chatId,
        name: bestMatch.title || "Unknown",
        service: bestMatch.service,
        accountId: bestMatch.accountID || "",
        type: (bestMatch.type as "single" | "group" | "space") || "single",
        lastMessageAt: bestMatch.lastActivity,
        unreadCount: bestMatch.unreadCount,
        isMuted: bestMatch.isMuted,
        isArchived: bestMatch.isArchived,
      };
    }

    if (!chatId) {
      return { success: false, error: "No chat ID or name provided" };
    }

    await client.focus({ chatID: chatId });
    await closeMainWindow();

    return { success: true, chat: foundChat };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to open chat";
    return { success: false, error: errorMessage };
  }
}
