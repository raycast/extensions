import { List } from "@raycast/api";
import { Chat } from "../services/telegram-client";
import { buildMarkdownWithMedia } from "../utils/markdown";

interface ChatListItemDetailProps {
  chat: Chat;
}

export function ChatListItemDetail({ chat }: ChatListItemDetailProps) {
  const markdown = buildMarkdownWithMedia({
    prefix: chat.lastMessage?.senderName ? `**${chat.lastMessage.senderName}**\n\n` : undefined,
    text: chat.lastMessage?.text,
    media: chat.lastMessage?.media,
  });

  return <List.Item.Detail markdown={markdown} />;
}
