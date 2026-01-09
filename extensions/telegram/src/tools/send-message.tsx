import { Tool } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import { sendMessage, getChatById } from "../services/telegram-client";
import { getConfig, ensureAuthenticated } from "../utils/auth";
import { getFileFromClipboard } from "../utils/clipboard";
import { handleTelegramError } from "../utils/errors";

interface Arguments {
  chatId: string;
  message: string;
  useClipboardFile?: boolean;
}

export default async function SendMessage(args: Arguments) {
  try {
    const { chatId, message, useClipboardFile } = args;

    if (!chatId) {
      return { success: false, error: "chatId is required" };
    }

    if (!message || !message.trim()) {
      return { success: false, error: "Message cannot be empty" };
    }

    const authenticated = await ensureAuthenticated();
    if (!authenticated) {
      return {
        success: false,
        error: "Not authenticated with Telegram. Please run 'Authenticate with Telegram' command first.",
      };
    }

    let filePath: string | undefined;
    if (useClipboardFile) {
      try {
        filePath = await getFileFromClipboard();

        if (!fs.existsSync(filePath)) {
          return { success: false, error: `File not found: ${filePath}` };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to read file from clipboard",
        };
      }
    }

    const config = getConfig();
    await sendMessage({ config, chatId, message, filePaths: filePath });

    return {
      success: true,
      message: "Message sent successfully",
    };
  } catch (error) {
    return handleTelegramError(error);
  }
}

export const confirmation: Tool.Confirmation<Arguments> = async (input) => {
  const config = getConfig();
  const chat = await getChatById(config, input.chatId);

  const infoItems = [
    { name: "To", value: chat?.title || input.chatId },
    { name: "Message", value: input.message },
  ];

  if (input.useClipboardFile) {
    try {
      const filePath = await getFileFromClipboard();
      infoItems.push({ name: "Attachment", value: path.basename(filePath) });
    } catch (error) {
      infoItems.push({
        name: "Attachment",
        value: error instanceof Error ? error.message : "Unable to read clipboard",
      });
    }
  }

  return {
    message: "Are you sure you want to send this message?",
    info: infoItems,
  };
};
