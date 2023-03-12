import { WhatsAppChat } from "./types";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { getStoredWhatsAppChats } from "./local-storage";

export function useWhatsAppChats() {
  const [chats, setChats] = useCachedState<Array<WhatsAppChat>>("whatsapp-chats", []);

  useEffect(() => {
    // Migrate old way of storing chats
    if (chats.length === 0) {
      getStoredWhatsAppChats().then((chats) => {
        setChats(chats);
      });
    }
  }, [chats]);

  return [chats, setChats] as const;
}
