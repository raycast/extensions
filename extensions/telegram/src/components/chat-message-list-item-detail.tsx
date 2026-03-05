import { List } from "@raycast/api";
import { ChatMessage, Chat } from "../services/telegram-client";
import { buildMarkdownWithMedia } from "../utils/markdown";

interface ChatMessageListItemDetailProps {
  message: ChatMessage;
  chat: Chat;
}

export function ChatMessageListItemDetail({ message }: ChatMessageListItemDetailProps) {
  const markdown = buildMarkdownWithMedia({
    prefix: message.senderName ? `**${message.senderName}**\n\n` : undefined,
    text: message.text,
    media: message.media,
  });

  return <List.Item.Detail markdown={markdown} />;
}
