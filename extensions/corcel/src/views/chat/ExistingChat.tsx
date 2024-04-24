import { useEffect, useState } from "react";
import ChatComponent from "./Chat";
import { Chat, getChatFromStorage } from "../../lib/chat";

const ExistingChat: React.FC<{ chatId: string }> = ({ chatId }) => {
  const [chat, setChat] = useState<Chat>();

  useEffect(() => {
    getChatFromStorage(chatId).then((chatFromStorage) => {
      if (chatFromStorage) {
        setChat(chatFromStorage);
      }
    });
  }, []);

  return <ChatComponent isLoading={!chat} chat={chat} />;
};

export default ExistingChat;
