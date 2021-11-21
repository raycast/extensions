import { useEffect, useState } from "react";
import { WhatsAppChat } from "./types";
import { getWhatsappChats } from "./get-whatsapp-chats";
import { getStoredWhatsAppChats, saveStoredPinnedPhones, saveStoredWhatsAppChats } from "./local-storage";

export function useWhatsappChats() {
  const [chats, setChats] = useState<Array<WhatsAppChat>>([]);

  useEffect(() => {
    const fetchChats = async () => {
      const storedChats = await getStoredWhatsAppChats();
      if (storedChats.length > 0) {
        setChats(storedChats);
      }
      setChats(await getWhatsappChats());
    };
    fetchChats();
  }, []);

  useEffect(() => {
    const syncChats = async () => {
      await saveStoredWhatsAppChats(chats);
      await saveStoredPinnedPhones(chats.filter(c => c.pinned).map(c => c.phone));
    };
    syncChats();
  }, [chats]);

  return [chats, setChats] as const;
}

