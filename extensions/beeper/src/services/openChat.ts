import { closeMainWindow } from "@raycast/api";
import { getBeeperClient } from "./beeper-client";
import { rankChatMatches, getSuggestionMessage } from "../utils/contact-matching";
import { BeeperChat, parseService } from "../utils/types";
import { loadAccountServiceCache } from "../utils/account-service-cache";

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
  const client = await getBeeperClient();

  try {
    let chatId = options.chatId;
    let foundChat: BeeperChat | undefined;
    const accountServices = await loadAccountServiceCache();

    if (!chatId && options.chatName) {
      const searchCursor = await client.chats.search({
        query: options.chatName,
        limit: 20,
      });

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
        const accountInfo = accountServices.get(chat.accountID);
        if (!accountInfo) {
          throw new Error(`Account metadata not loaded for ${chat.accountID}`);
        }

        allMatches.push({
          id: chat.id,
          title: chat.title || "",
          network: accountInfo.service,
          accountID: chat.accountID,
          type: chat.type,
          lastActivity: chat.lastActivity,
          unreadCount: chat.unreadCount,
          isMuted: chat.isMuted,
          isArchived: chat.isArchived,
        });
        if (allMatches.length >= 20) break;
      }

      const rankedMatches = rankChatMatches(allMatches, options.chatName, {
        service: options.service,
        minScore: 0.4,
        maxResults: 5,
      });

      if (rankedMatches.length === 0) {
        const allRanked = rankChatMatches(allMatches, options.chatName, {
          minScore: 0.3,
          maxResults: 3,
        });

        return {
          success: false,
          error: getSuggestionMessage(options.chatName, allRanked, options.service),
          suggestions: allRanked.map((m) => m.chat.title),
        };
      }

      const bestMatch = rankedMatches[0].chat;
      chatId = bestMatch.id;
      foundChat = {
        id: chatId,
        name: bestMatch.title || "Unknown",
        service: parseService(bestMatch.network),
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
