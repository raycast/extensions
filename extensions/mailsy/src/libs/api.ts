import { Cache, LocalStorage, environment } from "@raycast/api";
import axios from "axios";
import fs from "fs/promises";
import { Account, Domain, DomainResponse, Mail, MailResponse, Message, TokenResponse } from "../types";

const BASE_URL = "https://api.mail.tm";
const ACCOUNT_STORAGE_KEY = "account";
const REQUEST_TIMEOUT_MS = 10000;
const messageCache = new Cache();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

const generateRandomString = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

const generateEmail = (domain: string): string => {
  return `${generateRandomString()}@${domain}`;
};

const generatePassword = (): string => {
  return generateRandomString();
};

const fetchDomains = async (): Promise<Domain[]> => {
  const response = await api.get<DomainResponse>("/domains");
  return response.data["hydra:member"];
};

const createRemoteAccount = async (email: string, password: string): Promise<void> => {
  await api.post("/accounts", {
    address: email,
    password,
  });
};

const fetchAccountToken = async (email: string, password: string): Promise<TokenResponse> => {
  const response = await api.post<TokenResponse>("/token", {
    address: email,
    password,
  });

  return response.data;
};

const deleteRemoteAccount = async (id: string, token: string): Promise<void> => {
  await api.delete(`/accounts/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

const fetchMailSummaries = async (token: string): Promise<Mail[]> => {
  const response = await api.get<MailResponse>("/messages", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data["hydra:member"];
};

const fetchMessage = async (id: string, token: string): Promise<Message> => {
  const response = await api.get<Message>(`/messages/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

const deleteRemoteMessage = async (id: string, token: string): Promise<void> => {
  await api.delete(`/messages/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

const saveAccount = async (account: Account): Promise<void> => {
  await LocalStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
};

const getCachedMessage = (id: string): Message | null => {
  const cachedMessage = messageCache.get(id);
  return cachedMessage ? (JSON.parse(cachedMessage) as Message) : null;
};

const cacheMessage = (message: Message): void => {
  messageCache.set(message.id, JSON.stringify(message));
};

export const getMessageFilePath = (messageId: string): string => {
  return `${environment.assetsPath}/${messageId}.html`;
};

const writeMessageFile = async (message: Message): Promise<void> => {
  const content = message.html?.[0] ?? "No Content";
  await fs.writeFile(getMessageFilePath(message.id), content, "utf-8");
};

const ensureMessageFile = async (message: Message): Promise<void> => {
  try {
    await fs.access(getMessageFilePath(message.id));
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }

    await writeMessageFile(message);
  }
};

const deleteMessageFile = async (id: string): Promise<void> => {
  try {
    await fs.unlink(getMessageFilePath(id));
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }
};

const getMessageById = async (id: string, token: string): Promise<Message> => {
  const cachedMessage = getCachedMessage(id);
  if (cachedMessage) {
    await ensureMessageFile(cachedMessage);
    return cachedMessage;
  }

  const message = await fetchMessage(id, token);
  await ensureMessageFile(message);
  cacheMessage(message);
  return message;
};

export const createAccount = async (): Promise<void> => {
  const domains = await fetchDomains();
  const domain = domains[0]?.domain;

  if (!domain) {
    throw new Error("No mail domain available");
  }

  const email = generateEmail(domain);
  const password = generatePassword();

  await createRemoteAccount(email, password);

  const tokenResponse = await fetchAccountToken(email, password);

  await saveAccount({
    email,
    password,
    token: tokenResponse.token,
    id: tokenResponse.id,
  });
};

export const getAccount = async (): Promise<Account | undefined> => {
  const account = await LocalStorage.getItem<string>(ACCOUNT_STORAGE_KEY);
  return account ? (JSON.parse(account) as Account) : undefined;
};

export const deleteAccount = async (): Promise<void> => {
  const account = await getAccount();
  if (!account) return;

  await deleteRemoteAccount(account.id, account.token);
  await LocalStorage.removeItem(ACCOUNT_STORAGE_KEY);
};

export const getMails = async (): Promise<Message[]> => {
  const account = await getAccount();
  if (!account) return [];

  const mailSummaries = await fetchMailSummaries(account.token);
  const messages = await Promise.all(mailSummaries.map((mail) => getMessageById(mail.id, account.token)));

  return messages;
};

export const deleteMail = async (id: string): Promise<void> => {
  const account = await getAccount();
  if (!account) return;

  messageCache.remove(id);
  await deleteMessageFile(id);
  await deleteRemoteMessage(id, account.token);
};

export const getMessage = async (id: string): Promise<Message | null> => {
  const account = await getAccount();
  if (!account) return null;

  return getMessageById(id, account.token);
};
