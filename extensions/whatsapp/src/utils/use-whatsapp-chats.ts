import { useEffect, useState } from "react";
import { WhatsAppChat } from "./types";
import { getStoredWhatsAppChats, saveStoredWhatsAppChats } from "./local-storage";

export function useWhatsAppChats() {
  const [chats, setChats] = useState<Array<WhatsAppChat>>([]);

  useEffect(() => {
    getStoredWhatsAppChats().then(chats => {
      setChats(chats);
    });
  }, []);

  useEffect(() => {
    saveStoredWhatsAppChats(chats);
  }, [chats]);

  return [chats, setChats] as const;
}

