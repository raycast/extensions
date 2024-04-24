import { LocalStorage } from "@raycast/api";
import { Chat, ChatId, Exchange } from "./types";

type ChatsMap = Record<Chat["id"], Chat>;

const CHATS_KEY = "CHATS";

const parseChatsFromStorage = async () =>
  LocalStorage.getItem<string>(CHATS_KEY).then((chatsFromStorage) =>
    chatsFromStorage ? (JSON.parse(chatsFromStorage) as ChatsMap) : null,
  );

export const getChatsFromStorage = async () => {
  const chatsMap = await parseChatsFromStorage();

  if (chatsMap) {
    return Object.values(chatsMap);
  } else {
    return [];
  }
};

export const getChatFromStorage = async (chatId: Chat["id"]) => {
  // TODO use parse function
  const chatsFromStorage = await LocalStorage.getItem<string>(CHATS_KEY);

  if (chatsFromStorage) {
    const chatsMap = JSON.parse(chatsFromStorage) as ChatsMap;
    if (chatsMap[chatId]) {
      return chatsMap[chatId];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

export const addOrUpdateChatInStorage = async (chat: Chat) => {
  const chatsMap = (await parseChatsFromStorage()) || {};

  chatsMap[chat.id] = chat;

  await LocalStorage.setItem(CHATS_KEY, JSON.stringify(chatsMap));

  return chat;
};

export const deleteChatFromStorage = async (chatId: ChatId) => {
  const chatsMap = await parseChatsFromStorage();
  if (chatsMap) {
    const { [chatId]: _, ...remainingChats } = chatsMap;
    await LocalStorage.setItem(CHATS_KEY, JSON.stringify(remainingChats));
  }
};

export const deleteExchangeFromChatStorage = async (exchangeId: Exchange["id"], chatId: ChatId) => {
  const chatsMap = await parseChatsFromStorage();

  if (chatsMap) {
    const chat = chatsMap[chatId];
    if (chat) {
      const newExchanges = chat.exchanges.filter((exchng) => exchng.id !== exchangeId);
      chat.exchanges = newExchanges;
      chatsMap[chatId] = chat;
      chatsMap[chatId].updated_on = new Date().toISOString();

      await LocalStorage.setItem(CHATS_KEY, JSON.stringify(chatsMap));
    }
  }
};
