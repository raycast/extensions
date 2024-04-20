import { useEffect, useState } from "react";
import ChatComponent from "./Chat";
import { Chat, getChatFromStorage } from "../../lib/chat";

const ExistingChat: React.FC<{ chatId: string }> = ({ chatId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [chat, setChat] = useState<Chat>();

  useEffect(() => {
    getChatFromStorage(chatId).then((chatFromStorage) => {
      if (chatFromStorage) {
        setChat(chatFromStorage);
      }
      setIsLoading(false);
    });
  }, []);

  return <ChatComponent isLoading={isLoading} chat={chat} />;
};

export default ExistingChat;
