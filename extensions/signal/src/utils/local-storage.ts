import { SignalChat } from "./types";
import { LocalStorage } from "@raycast/api";

const signalStorageKey = "signal-chats";

export async function getStoredSignalChats(): Promise<Array<SignalChat>> {
  return JSON.parse((await LocalStorage.getItem(signalStorageKey)) || "[]");
}

export async function saveStoredSignalChats(contacts: Array<SignalChat>): Promise<void> {
  await LocalStorage.setItem(signalStorageKey, JSON.stringify(contacts));
}
