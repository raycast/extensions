import { WhatsAppChat } from "./types";
import { getLocalStorageItem, setLocalStorageItem } from "@raycast/api";

const whatsAppStorageKey = "whatsapp-chats";

export async function getStoredWhatsAppChats(): Promise<Array<WhatsAppChat>> {
  return JSON.parse((await getLocalStorageItem(whatsAppStorageKey)) || "[]");
}

export async function saveStoredWhatsAppChats(contacts: Array<WhatsAppChat>): Promise<void> {
  await setLocalStorageItem(whatsAppStorageKey, JSON.stringify(contacts));
}
