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
      throw new Error("Chat ID is required");
    }

    if (!message || !message.trim()) {
      throw new Error("Message cannot be empty");
    }

    const authenticated = await ensureAuthenticated();
    if (!authenticated) {
      throw new Error("Not authenticated with Telegram. Please run the 'Authenticate with Telegram' command first.");
    }

    let filePath: string | undefined;
    if (useClipboardFile) {
      filePath = await getFileFromClipboard();

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
    }

    const config = getConfig();
    await sendMessage({ config, chatId, message, filePaths: filePath });

    return {
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
