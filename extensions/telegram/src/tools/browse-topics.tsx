import { getChatById, getChatTopics } from "../services/telegram-client";
import { getConfig, ensureAuthenticated } from "../utils/auth";
import { handleTelegramError } from "../utils/errors";

interface Arguments {
  chatId: string;
  query?: string;
}

export default async function BrowseTopics(args: Arguments) {
  try {
    const { chatId, query } = args;
    if (!chatId) {
      throw new Error("Chat ID is required");
    }

    const authenticated = await ensureAuthenticated();
    if (!authenticated) {
      throw new Error("Not authenticated with Telegram. Please run the 'Authenticate with Telegram' command first.");
    }

    const config = getConfig();
    const chat = await getChatById(config, chatId);
    if (!chat?.isForum) {
      throw new Error("This chat is not a forum group");
    }

    const topics = await getChatTopics({
      config,
      chatId,
      searchQuery: query,
      skipMediaDownload: true,
    });

    return {
      chat: { id: chat.id, title: chat.title },
      topics: topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        lastMessage: topic.lastMessage?.text,
        lastMessageSender: topic.lastMessage?.isOutgoing ? "You" : topic.lastMessage?.senderName,
        lastActivityDate: topic.lastActivityDate.toISOString(),
        unreadCount: topic.unreadCount,
        unreadMentionsCount: topic.unreadMentionsCount,
        isPinned: topic.isPinned,
        isClosed: topic.isClosed,
      })),
    };
  } catch (error) {
    return handleTelegramError(error);
  }
}
