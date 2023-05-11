import { Cache, getPreferenceValues } from "@raycast/api";
import { Account, Message, Preferences } from "../types";

export enum ExpirationTime {
  Minute = 60 * 1000,
  Hour = 60 * Minute,
  Day = 24 * Hour,
  Week = 7 * Day,
}

const preferences: Preferences = getPreferenceValues();
const messageLimit = preferences.messageLimit ? parseInt(preferences.messageLimit) : 10;

const isCacheExpired = (time: number, limit = ExpirationTime.Day): boolean => {
  return Date.now() - time > limit;
};

const accounts = new Cache();

export const invalidateAccounts = () => {
  accounts.clear();
};

export const getAccounts = (): Account[] | undefined => {
  if (accounts.has("accounts")) {
    const response = accounts.get("accounts");
    if (response) {
      const { time, data } = JSON.parse(response);
      if (!isCacheExpired(time)) {
        return data;
      }
    }
  }

  return undefined;
};

export const getAccount = (idOrName: string): Account | undefined => {
  return getAccounts()?.find((x) => x.id === idOrName || x.name === idOrName);
};

export const setAccounts = (data: Account[]) => {
  accounts.set("accounts", JSON.stringify({ time: Date.now(), data: data }));
};

const messages = new Cache();

export const invalidateMessages = () => {
  messages.clear();
};

export const getMessages = (account: string, mailbox: string): Message[] => {
  const key = `${account}-${mailbox}`;
  if (messages.has(key)) {
    const response = messages.get(key);
    if (response) {
      const { time, data } = JSON.parse(response);
      if (!isCacheExpired(time)) {
        return data.slice(0, messageLimit);
      }
    }
  }

  return [];
};

export const setMessages = (data: Message[], account: string, mailbox: string) => {
  const key = `${account}-${mailbox}`;
  messages.set(key, JSON.stringify({ time: Date.now(), data: data }));
};

export const addMessage = (data: Message, account: string, mailbox: string) => {
  const currentMessages = getMessages(account, mailbox);
  const nextMessages = [...currentMessages, data];

  setMessages(nextMessages, account, mailbox);
};

export const updateMessage = (id: string, data: Message, account: string, mailbox: string) => {
  const currentMessages = getMessages(account, mailbox);
  const nextMessages = currentMessages.map((currentMessage) => {
    if (currentMessage.id === id) {
      return { ...currentMessage, ...data };
    }

    return currentMessage;
  });

  setMessages(nextMessages, account, mailbox);
};

export const deleteMessage = (id: string, account: string, mailbox: string) => {
  const currentMessages = getMessages(account, mailbox);
  const nextMessages = currentMessages.filter((currentMessage) => currentMessage.id !== id);

  setMessages(nextMessages, account, mailbox);
};
