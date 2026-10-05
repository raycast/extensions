import { Chat } from "./services/telegram-client";
import { ChatMessagesView } from "./components/chat-messages-view";

interface ViewChatMessagesProps {
  chat: Chat;
}

export default function ViewChatMessages({ chat }: ViewChatMessagesProps) {
  return <ChatMessagesView chat={chat} />;
}
