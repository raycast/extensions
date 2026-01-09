import { getChats } from "../services/telegram-client";
import { getConfig, ensureAuthenticated } from "../utils/auth";

export default async function BrowseChats() {
  try {
    const authenticated = await ensureAuthenticated();
    if (!authenticated) {
      return {
        success: false,
        error: "Not authenticated with Telegram. Please run 'Authenticate with Telegram' command first.",
      };
    }

    const config = getConfig();
    const chats = await getChats({ config, limit: 50, skipPhotoDownload: true });

    return {
      success: true,
      chats: chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        type: chat.type,
        lastMessage: chat.lastMessage,
        lastMessageDate: chat.lastMessageDate?.toISOString(),
        isPinned: chat.isPinned,
        unreadCount: chat.unreadCount,
      })),
    };
  } catch (error) {
    // Handle Telegram rate limiting
    if (error instanceof Error && error.message.includes("FloodWaitError")) {
      const match = error.message.match(/(\d+) seconds/);
      const seconds = match ? match[1] : "unknown";
      return {
        success: false,
        error: `Rate limited by Telegram. Please wait ${seconds} seconds before trying again.`,
      };
    }
    return {
      success: false,
      error: `Failed to browse chats: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
