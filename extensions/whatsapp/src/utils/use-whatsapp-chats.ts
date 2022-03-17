import { useEffect, useState } from "react";
import { WhatsAppChat } from "./types";
import { getStoredWhatsAppChats, saveStoredWhatsAppChats } from "./local-storage";

export function useWhatsAppChats() {
  const [chats, setChats] = useState<Array<WhatsAppChat>>();

  useEffect(() => {
    getStoredWhatsAppChats().then((chats) => {
      setChats(chats);
    });
  }, []);

  return {
    chats: chats || [],
    isLoading: chats === undefined,
    updateChats: async (chats: Array<WhatsAppChat>) => {
      setChats(chats);
      await saveStoredWhatsAppChats(chats);
    },
  };
}
