import { WhatsAppChat } from "./types";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { getStoredWhatsAppChats } from "./local-storage";

export function useWhatsAppChats() {
  const [chats, setChats] = useCachedState<Array<WhatsAppChat>>("whatsapp-chats", []);
  const [migrated, setMigrated] = useCachedState<boolean>("migrated", false);

  useEffect(() => {
    // Migrate old way of storing chats
    if (!migrated) {
      getStoredWhatsAppChats().then((chats) => {
        setChats(chats);
        setMigrated(true);
      });
    }
  }, [migrated]);

  return [chats, setChats] as const;
}
