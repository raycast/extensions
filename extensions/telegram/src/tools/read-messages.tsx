import { getChatMessages } from "../services/telegram-client";
import { getConfig, ensureAuthenticated } from "../utils/auth";
import { handleTelegramError } from "../utils/errors";

interface Arguments {
  chatId: string;
  limit?: number;
}

export default async function ReadMessages(args: Arguments) {
  try {
    const { chatId, limit = 20 } = args;

    if (!chatId) {
      return { success: false, error: "chatId is required" };
    }

    const authenticated = await ensureAuthenticated();
    if (!authenticated) {
      return {
        success: false,
        error: "Not authenticated with Telegram. Please run 'Authenticate with Telegram' command first.",
      };
    }

    const config = getConfig();
    const messages = await getChatMessages({ config, chatId, limit, skipMediaDownload: true });

    return {
      success: true,
      messages: messages.map((msg) => ({
        id: msg.id,
        text: msg.text,
        senderName: msg.senderName,
        senderId: msg.senderId,
        date: msg.date.toISOString(),
        media: msg.media
          ? {
              type: msg.media.type,
              fileName: msg.media.fileName,
            }
          : undefined,
      })),
    };
  } catch (error) {
    return handleTelegramError(error);
  }
}
