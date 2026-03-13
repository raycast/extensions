import { Cache as RaycastCache } from "@raycast/api";

import { Account, Message } from "../types";
import { messageLimit } from "./common";

export enum ExpirationTime {
  Minute = 60 * 1000,
  Hour = 60 * Minute,
  Day = 24 * Hour,
  Week = 7 * Day,
}

const CACHE_VERSION = 7;

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
  accounts.set("accounts", JSON.stringify({ time: Date.now(), data, version: CACHE_VERSION }));
};

const messagesSummary = new RaycastCache();
const messagesDetail = new RaycastCache();

const summaryKey = (account: string, mailbox: string) => `${account}-${mailbox}-summary`;
const detailKey = (account: string, mailbox: string) => `${account}-${mailbox}-detail`;

const invalidateMessages = () => {
  messagesSummary.clear();
  messagesDetail.clear();
};

const getMessagesSummary = (account: string, mailbox: string): Message[] => {
  const key = summaryKey(account, mailbox);
  if (messagesSummary.has(key)) {
    const response = messagesSummary.get(key);
    if (response) {
      const { time, data, version } = JSON.parse(response);
      if (!isCacheExpired(time) && version === CACHE_VERSION) {
        return (data as Message[]).slice(0, messageLimit);
      }
    }
  }

  return [];
};

const getMessagesDetail = (account: string, mailbox: string): Message[] => {
  const key = detailKey(account, mailbox);
  if (messagesDetail.has(key)) {
    const response = messagesDetail.get(key);
    if (response) {
      const { time, data, version } = JSON.parse(response);
      if (!isCacheExpired(time) && version === CACHE_VERSION) {
        return data as Message[];
      }
    }
  }

  return [];
};

const setMessagesSummary = (data: Message[], account: string, mailbox: string) => {
  const key = summaryKey(account, mailbox);
  messagesSummary.set(key, JSON.stringify({ time: Date.now(), data, version: CACHE_VERSION }));
};

const setMessagesDetail = (data: Message[], account: string, mailbox: string) => {
  const key = detailKey(account, mailbox);
  messagesDetail.set(key, JSON.stringify({ time: Date.now(), data, version: CACHE_VERSION }));
};

const mergeById = (base: Message[], incoming: Message[]): Message[] => {
  const map = new Map<string, Message>();
  for (const item of base) map.set(item.id, item);
  for (const item of incoming) {
    const existing = map.get(item.id);
    map.set(item.id, existing ? { ...existing, ...item } : item);
  }
  return Array.from(map.values());
};

/**
 * Compatibility wrapper:
 * Historically callers used `getMessages(account, mailbox)` and expected one list.
 * We now prefer detail when available, then merge with summary for resilience.
 */
const getMessages = (account: string, mailbox: string): Message[] => {
  const detail = getMessagesDetail(account, mailbox);
  const summary = getMessagesSummary(account, mailbox);

  if (detail.length === 0) return summary.slice(0, messageLimit);
  if (summary.length === 0) return detail.slice(0, messageLimit);

  return mergeById(detail, summary).slice(0, messageLimit);
};

/**
 * Compatibility wrapper:
 * Historically callers used `setMessages(data, account, mailbox)`.
 * We persist to detail and also keep summary in sync.
 */
const setMessages = (data: Message[], account: string, mailbox: string) => {
  setMessagesDetail(data, account, mailbox);
  setMessagesSummary(data, account, mailbox);
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
  const allAccounts = getAccounts();

  if (!allAccounts || allAccounts.length === 0) {
    return undefined;
  }

  const defaultAccountId = defaultAccount.get("default-account-id");

  if (defaultAccountId) {
    const account = allAccounts.find((account) => account.id === defaultAccountId);
    if (account) return account;
  }

  return allAccounts[0];
};

const setDefaultAccount = (id: string) => {
  defaultAccount.set("default-account-id", id);
};

const clearAll = () => {
  accounts.clear();
  messagesSummary.clear();
  messagesDetail.clear();
  defaultAccount.clear();
};

const inspectState = () => {
  return {
    hasAccounts: accounts.has("accounts"),
    hasDefaultAccount: defaultAccount.has("default-account-id"),
  };
};

export const Cache = Object.freeze({
  getAccounts,
  setAccounts,
  getDefaultAccount,
  setDefaultAccount,
  getAccount,
  invalidateAccounts,
  clearAll,
  inspectState,

  // New staged API
  getMessagesSummary,
  setMessagesSummary,
  getMessagesDetail,
  setMessagesDetail,

  // Compatibility API
  getMessages,
  setMessages,

  addMessage,
  updateMessage,
  deleteMessage,
  invalidateMessages,
});
