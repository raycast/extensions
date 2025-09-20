import { useCallback, useEffect, useState } from "react";
import { Chat, ChatId, getChatsFromStorage, deleteChatFromStorage } from "../lib/chat";

export const useChats = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchChatsFromLocalStorage = useCallback(async () => {
    setIsLoading(true);
    const chatsFromStorage = await getChatsFromStorage();
    chatsFromStorage.sort((a, b) => new Date(b.updated_on).getTime() - new Date(a.updated_on).getTime());
    setChats(chatsFromStorage);
    setIsLoading(false);
  }, [setChats]);

  useEffect(() => {
    fetchChatsFromLocalStorage();
  }, []);

  const deleteChat = useCallback(
    async (chatId: ChatId) => {
      await deleteChatFromStorage(chatId).then(() => {
        setChats(chats.filter((chat) => chat.id !== chatId));
      });
    },
    [chats, setChats],
  );

  return { chats, isLoading, deleteChat, fetchChatsFromLocalStorage };
};
