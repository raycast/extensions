import { getChatMessages } from "../services/telegram-client";
import { getConfig, ensureAuthenticated } from "../utils/auth";

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
      error: `Failed to read messages: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
