import { Cache } from "@raycast/api";
import { Account, Message } from "../types/types";

export enum ExpirationTime {
  Minute = 60 * 1000,
  Hour = 60 * Minute,
  Day = 24 * Hour,
  Week = 7 * Day,
}

const isCacheExpired = (time: number, limit = ExpirationTime.Hour): boolean => {
  return Date.now() - time > limit;
};

const accounts = new Cache();

export const getAccounts = (): Account[] | undefined => {
  if (accounts.has("accounts")) {
    const { time, data } = JSON.parse(accounts.get("accounts")!);
    if (!isCacheExpired(time)) {
      return data;
    }
  }
  return undefined;
};

export const setAccounts = (data: Account[]): void => {
  accounts.set("accounts", JSON.stringify({ time: Date.now(), data: data }));
};

const messages = new Cache();

export const getMessages = (account: string, mailbox: string): Message[] => {
  const key = `${account}-${mailbox}`;
  if (messages.has(key)) {
    const { time, data } = JSON.parse(messages.get(key)!);
    if (!isCacheExpired(time, ExpirationTime.Hour)) {
      return data;
    }
  }
  return [];
};

export const setMessages = (data: Message[], account: string, mailbox: string): void => {
  const key = `${account}-${mailbox}`;
  messages.set(key, JSON.stringify({ time: Date.now(), data: data }));
};
