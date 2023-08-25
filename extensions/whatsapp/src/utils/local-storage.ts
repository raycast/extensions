import { WhatsAppChat } from "./types";
import { LocalStorage } from "@raycast/api";

const whatsAppStorageKey = "whatsapp-chats";

/**
 * @deprecated Use `useCachedState` instead
 */
export async function getStoredWhatsAppChats(): Promise<Array<WhatsAppChat>> {
  return JSON.parse((await LocalStorage.getItem(whatsAppStorageKey)) || "[]");
}
