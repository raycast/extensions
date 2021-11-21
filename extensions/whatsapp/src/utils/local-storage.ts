import { WhatsAppContact } from "./types";
import { getLocalStorageItem, setLocalStorageItem } from "@raycast/api";

export async function getStoredWhatsAppContacts(): Promise<Array<WhatsAppContact>> {
  return JSON.parse(await getLocalStorageItem("contacts") || "[]");
}

export async function saveStoredWhatsAppContacts(contacts: Array<WhatsAppContact>): Promise<void> {
  await setLocalStorageItem("contacts", JSON.stringify(contacts));
}

export async function getStoredPinnedPhones(): Promise<Array<string>> {
  return JSON.parse(await getLocalStorageItem("pinnedContactPhones") || "[]");
}

export async function saveStoredPinnedPhones(phones: Array<string>): Promise<void> {
  await setLocalStorageItem("pinnedContactPhones", JSON.stringify(phones));
}
