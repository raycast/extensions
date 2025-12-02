import { Chat } from "./types";
import * as fs from "fs";
import { LocalStorage, environment } from "@raycast/api";

/**
 * Updates a chat's settings.
 * @param chat The chat to update.
 * @param newData The new data to use.
 * @returns A promise that resolves when the chat has been updated.
 */
export async function updateChat(chat: Chat, newData: Chat) {
  const supportPath = environment.supportPath;
  const chatsDir = `${supportPath}/chats`;

  if (chat.name !== newData.name) {
    // Rename the chat file
    const oldChatFile = `${chatsDir}/${chat.name}.txt`;
    const newChatFile = `${chatsDir}/${newData.name}.txt`;
    fs.renameSync(oldChatFile, newChatFile);
    await LocalStorage.removeItem(`--chat-${chat.name}`);
  }
  await LocalStorage.setItem(`--chat-${newData.name}`, JSON.stringify(newData));
}

/**
 * Deletes a chat.
 * @param chat The chat to delete.
 * @returns A promise that resolves when the chat has been deleted.
 */
export async function deleteChat(chat: Chat) {
  const supportPath = environment.supportPath;
  const chatsDir = `${supportPath}/chats`;

  // Delete the chat file and remove it from the active list of chats
  const chatFile = `${chatsDir}/${chat.name}.txt`;
  if (fs.existsSync(chatFile)) {
    fs.unlinkSync(chatFile);
  }

  // Remove the chat's settings entry
  await LocalStorage.removeItem(`--chat-${chat.name}`);
}
