import { List } from "@raycast/api";
import { Chat } from "../services/telegram-client";
import { buildMarkdownWithMedia } from "../utils/markdown";

interface ChatListItemDetailProps {
  chat: Chat;
}

export function ChatListItemDetail({ chat }: ChatListItemDetailProps) {
  const markdown = buildMarkdownWithMedia({
    media: chat.lastMessageMedia,
    text: chat.lastMessage,
  });

  return <List.Item.Detail markdown={markdown} />;
}
