import { List } from "@raycast/api";
import * as fs from "fs";
import { ChatMessage, Chat } from "../services/telegram-client";

interface ChatMessageListItemDetailProps {
  message: ChatMessage;
  chat: Chat;
}

export function ChatMessageListItemDetail({ message, chat }: ChatMessageListItemDetailProps) {
  let markdown = "";

  // Add sender info for group chats
  if (chat.type === "group" && message.senderName) {
    markdown = `**${message.senderName}**\n\n`;
  }

  // Convert image to base64 and embed in markdown if media file path is available
  if (message.media?.filePath && ["photo", "image"].includes(message.media.type)) {
    try {
      if (fs.existsSync(message.media.filePath)) {
        const imageBuffer = fs.readFileSync(message.media.filePath);
        const base64Image = imageBuffer.toString("base64");
        const mimeType = message.media.mimeType || "image/jpeg";
        markdown += `![](data:${mimeType};base64,${base64Image})`;
      }
    } catch (error) {
      console.error("Failed to read image file:", error);
    }
  }

  // Add message text if available
  if (message.text) {
    if (markdown) {
      markdown += "\n\n" + message.text;
    } else {
      markdown = message.text;
    }
  }

  return <List.Item.Detail markdown={markdown} />;
}
