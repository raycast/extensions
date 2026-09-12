import { Chat, getChatFromStorage } from "../lib/chat";
import { useEffect, useState } from "react";

export const useChat = (chatId: Chat["id"]) => {
  const [chat, setChat] = useState<Chat>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const chatFromStorage = await getChatFromStorage(chatId);
      if (chatFromStorage) {
        chatFromStorage.exchanges.sort((a, b) => new Date(b.created_on).getTime() - new Date(a.created_on).getTime());
        setChat(chatFromStorage);
        setIsLoading(false);
      } else {
        // TODO - Error handling
      }
    })();
  }, []);

  return { chat, isLoading };
};
