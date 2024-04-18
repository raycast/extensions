import { useChat } from "../../hooks";
import ChatTemplate from "../chat/ChatTemplate";

const Chat: React.FC<{ chatId: string }> = ({ chatId }) => {
  const { chat, isLoading } = useChat(chatId);

  return <ChatTemplate chat={chat} isLoading={isLoading} />;
};

export default Chat;
