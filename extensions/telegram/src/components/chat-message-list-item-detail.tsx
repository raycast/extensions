import { List } from "@raycast/api";
import { ChatMessage, Chat } from "../services/telegram-client";
import { buildMarkdownWithMedia } from "../utils/markdown";

interface ChatMessageListItemDetailProps {
  message: ChatMessage;
  chat: Chat;
}

export function ChatMessageListItemDetail({ message, chat }: ChatMessageListItemDetailProps) {
  // Add sender info for group chats as prefix
  const prefix = chat.type === "group" && message.senderName ? `**${message.senderName}**\n\n` : "";

  const markdown = buildMarkdownWithMedia({
    media: message.media,
    text: message.text,
    prefix,
  });

  return <List.Item.Detail markdown={markdown} />;
}
