import { WhatsAppChat } from "./types";
import { getLocalStorageItem, setLocalStorageItem } from "@raycast/api";

const whatsAppStorageKey = "whatsapp-chats";
const pinnedPhonesStorageKey = "whatsapp-pinned-phones";

export async function getStoredWhatsAppChats(): Promise<Array<WhatsAppChat>> {
  return JSON.parse(await getLocalStorageItem(whatsAppStorageKey) || "[]");
}

export async function saveStoredWhatsAppChats(contacts: Array<WhatsAppChat>): Promise<void> {
  await setLocalStorageItem(whatsAppStorageKey, JSON.stringify(contacts));
}

export async function getStoredPinnedPhones(): Promise<Array<string>> {
  return JSON.parse(await getLocalStorageItem(pinnedPhonesStorageKey) || "[]");
}

export async function saveStoredPinnedPhones(phones: Array<string>): Promise<void> {
  await setLocalStorageItem(pinnedPhonesStorageKey, JSON.stringify(phones));
}
