import { List } from "@raycast/api";
import { Chat } from "../services/telegram-client";
import { buildMarkdownWithMedia } from "../utils/markdown";

interface ChatListItemDetailProps {
  chat: Chat;
}

export function ChatListItemDetail({ chat }: ChatListItemDetailProps) {
  // Add sender info as prefix when available
  const prefix = chat.lastMessage?.senderName ? `**${chat.lastMessage.senderName}**\n\n` : "";

  const markdown = buildMarkdownWithMedia({
    media: chat.lastMessage?.media,
    text: chat.lastMessage?.text,
    prefix,
  });

  return <List.Item.Detail markdown={markdown} />;
}
