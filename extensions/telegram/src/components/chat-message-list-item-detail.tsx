import { List } from "@raycast/api";
import { ChatMessage, Chat } from "../services/telegram-client";
import { buildMarkdownWithMedia } from "../utils/markdown";

interface ChatMessageListItemDetailProps {
  message: ChatMessage;
  chat: Chat;
}

export function ChatMessageListItemDetail({ message }: ChatMessageListItemDetailProps) {
  // Add sender info as prefix when available
  const prefix = message.senderName ? `**${message.senderName}**\n\n` : "";

  const markdown = buildMarkdownWithMedia({
    media: message.media,
    text: message.text,
    prefix,
  });

  return <List.Item.Detail markdown={markdown} />;
}
