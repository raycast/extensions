import { getChats } from "../services/telegram-client";
import { getConfig, ensureAuthenticated } from "../utils/auth";
import { handleTelegramError } from "../utils/errors";

export default async function BrowseChats() {
  try {
    const authenticated = await ensureAuthenticated();
    if (!authenticated) {
      throw new Error("Not authenticated with Telegram. Please run the 'Authenticate with Telegram' command first.");
    }

    const config = getConfig();
    const chats = await getChats({ config, limit: 50, skipPhotoDownload: true });

    return {
      chats: chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        type: chat.type,
        lastMessage: chat.lastMessage?.text,
        lastMessageDate: chat.lastMessage?.date?.toISOString(),
        isPinned: chat.isPinned,
        unreadCount: chat.unreadCount,
      })),
    };
  } catch (error) {
    return handleTelegramError(error);
  }
}
