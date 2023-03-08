import { WhatsAppChat } from "./types";
import { LocalStorage } from "@raycast/api";

const whatsAppStorageKey = "whatsapp-chats";

export async function getStoredWhatsAppChats(): Promise<Array<WhatsAppChat>> {
  return JSON.parse((await LocalStorage.getItem(whatsAppStorageKey)) || "[]");
}

export async function saveStoredWhatsAppChats(contacts: Array<WhatsAppChat>): Promise<void> {
  await LocalStorage.setItem(whatsAppStorageKey, JSON.stringify(contacts));
}
