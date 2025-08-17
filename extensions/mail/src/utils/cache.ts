import { Cache as RaycastCache } from "@raycast/api";

import { Account, Message } from "../types";
import { messageLimit } from "./common";

export enum ExpirationTime {
  Minute = 60 * 1000,
  Hour = 60 * Minute,
  Day = 24 * Hour,
  Week = 7 * Day,
}

const CACHE_VERSION = 1;

const isCacheExpired = (time: number, limit = ExpirationTime.Day): boolean => {
  return Date.now() - time > limit;
};

const accounts = new RaycastCache();

const invalidateAccounts = () => {
  accounts.clear();
};

const getAccounts = (): Account[] | undefined => {
  if (accounts.has("accounts")) {
    const response = accounts.get("accounts");
    if (response) {
      const { time, data, version } = JSON.parse(response);
      if (!isCacheExpired(time) && version === CACHE_VERSION) {
        return data;
      }
    }
  }

  return undefined;
};

const getAccount = (idOrName: string): Account | undefined => {
  return getAccounts()?.find((x) => x.id === idOrName || x.name === idOrName);
};

const setAccounts = (data: Account[]) => {
  accounts.set("accounts", JSON.stringify({ time: Date.now(), data: data, version: CACHE_VERSION }));
};

const messages = new RaycastCache();

const invalidateMessages = () => {
  messages.clear();
};

const getMessages = (account: string, mailbox: string): Message[] => {
  const key = `${account}-${mailbox}`;
  if (messages.has(key)) {
    const response = messages.get(key);
    if (response) {
      const { time, data, version } = JSON.parse(response);
      if (!isCacheExpired(time) && version === CACHE_VERSION) {
        return data.slice(0, messageLimit);
      }
    }
  }

  return [];
};

const setMessages = (data: Message[], account: string, mailbox: string) => {
  const key = `${account}-${mailbox}`;
  messages.set(key, JSON.stringify({ time: Date.now(), data: data, version: CACHE_VERSION }));
};

const addMessage = (data: Message, account: string, mailbox: string) => {
  const currentMessages = getMessages(account, mailbox);
  const nextMessages = [...currentMessages, data];

  setMessages(nextMessages, account, mailbox);
};

const updateMessage = (id: string, data: Message, account: string, mailbox: string) => {
  const currentMessages = getMessages(account, mailbox);
  const nextMessages = currentMessages.map((currentMessage) => {
    if (currentMessage.id === id) {
      return { ...currentMessage, ...data };
    }

    return currentMessage;
  });

  setMessages(nextMessages, account, mailbox);
};

const deleteMessage = (id: string, account: string, mailbox: string) => {
  const currentMessages = getMessages(account, mailbox);
  const nextMessages = currentMessages.filter((currentMessage) => currentMessage.id !== id);

  setMessages(nextMessages, account, mailbox);
};

const defaultAccount = new RaycastCache();

const getDefaultAccount = (): Account | undefined => {
  const accounts = getAccounts();

  if (!accounts || accounts.length === 0) {
    return undefined;
  }

  const defaultAccountId = defaultAccount.get("default-account-id");

  if (defaultAccountId) {
    const account = accounts.find((account) => account.id === defaultAccountId);
    if (account) return account;
  }

  return accounts[0];
};

const setDefaultAccount = (id: string) => {
  defaultAccount.set("default-account-id", id);
};

export const Cache = Object.freeze({
  getAccounts,
  setAccounts,
  getDefaultAccount,
  setDefaultAccount,
  getAccount,
  invalidateAccounts,
  getMessages,
  setMessages,
  addMessage,
  updateMessage,
  deleteMessage,
  invalidateMessages,
});
