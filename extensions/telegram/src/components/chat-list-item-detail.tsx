import { List } from "@raycast/api";
import { Chat } from "../services/telegram-client";

interface ChatListItemDetailProps {
  chat: Chat;
}

export function ChatListItemDetail({ chat }: ChatListItemDetailProps) {
  const markdown = `
# ${chat.title}

${chat.photo ? `![Chat Photo](${chat.photo})` : ""}

## Chat Information

- **Type**: ${chat.type === "private" ? "Private Chat" : "Group Chat"}
- **Unread Messages**: ${chat.unreadCount}
${chat.isPinned ? "- **Pinned**: Yes" : ""}

${chat.lastMessage ? `## Last Message\n\n${chat.lastMessage}` : ""}
  `.trim();

  return <List.Item.Detail markdown={markdown} />;
}
