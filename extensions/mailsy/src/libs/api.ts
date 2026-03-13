import axios from "axios";
import { Domain, DomainResponse, Account, TokenResponse, Mail, MailResponse, Message } from "../types";
import {
  deleteMessageCache,
  generateEmail,
  generatePassword,
  getCacheMessage,
  getMessageOrUseCache,
  isNotNull,
} from "./utils";
import { LocalStorage } from "@raycast/api";

// CONSTANTS
const BASE_URL = "https://api.mail.tm";

// axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Get Domains
export const getDomains = async (): Promise<Domain[]> => {
  const response = await api.get<DomainResponse>("/domains");
  return response.data["hydra:member"];
};

// Post Account Request
export const postAccountRequest = async (email: string, password: string): Promise<void> => {
  await api.post("/accounts", {
    address: email,
    password: password,
  });
};

// post Delete Account Request
export const postDeleteAccountRequest = async (id: string, token: string): Promise<void> => {
  await api.delete(`/accounts/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

// Get Mails Request
export const getMailsRequest = async (token: string): Promise<Mail[]> => {
  const response = await api.get<MailResponse>("/messages", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data["hydra:member"];
};

// Get Account Token
export const getAccountToken = async (email: string, password: string): Promise<TokenResponse> => {
  const response: TokenResponse = await api
    .post("/token", {
      address: email,
      password: password,
    })
    .then((response) => response.data);

  return {
    token: response.token,
    id: response.id,
  };
};

// Save Account, Accpets Account Object
export const saveAccount = async (email: string, password: string, token: string, id: string): Promise<void> => {
  const account: Account = {
    email,
    password,
    token,
    id,
  };
  await LocalStorage.setItem("account", JSON.stringify(account));
};

// Delete Email
export const deleteEmailRequest = async (id: string): Promise<void> => {
  // Get Account
  const account: Account = await getAccount();

  // if no account, return
  if (!account) return;

  // Delete Email Request
  await api.delete(`/messages/${id}`, {
    headers: {
      Authorization: `Bearer ${account.token}`,
    },
  });
};

// Create Account
export const createAccount = async (): Promise<void> => {
  // Get Domains
  const domains: Domain[] = await getDomains();
  // Extract Domain
  const domain = domains[0].domain;
  // Generate Email, Password
  const [email, password] = await Promise.all([generateEmail(domain), generatePassword()]);

  // Post Account Request
  await postAccountRequest(email, password);

  // Get Account Token
  const TokenResponse = await getAccountToken(email, password);

  // Save Account
  await saveAccount(email, password, TokenResponse.token, TokenResponse.id);
};

// Get Account
export const getAccount = async (): Promise<Account> => {
  const account = await LocalStorage.getItem<string>("account");
  return account ? JSON.parse(account) : undefined;
};

// Delete Account
export const deleteAccount = async (): Promise<void> => {
  // Get Account
  const account: Account = await getAccount();

  // if no account, return
  if (!account) return;

  try {
    // Post Delete Account Request
    await postDeleteAccountRequest(account.id, account.token);

    // Remove Account
    await LocalStorage.removeItem("account");
  } catch (error) {
    console.log(error);
  }
};

// Get Mails
export const getMails = async (): Promise<Message[]> => {
  const account: Account = await getAccount();

  if (!account) return [];

  const mails: Mail[] = await getMailsRequest(account.token);

  const messages: (Message | null)[] = await Promise.all(mails.map((mail) => getMessageOrUseCache(mail)));

  const filteredMessages: Message[] = messages.filter(isNotNull);

  return filteredMessages;
};

// Delete Mail
export const deleteMail = async (id: string): Promise<void> => {
  await deleteMessageCache(id);
  await deleteEmailRequest(id);
};

// Get Mail Request
export const getMailRequest = async (id: string, token: string): Promise<Message> => {
  const response = await api.get<Message>(`/messages/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// Get Mail
export const getMessage = async (id: string): Promise<Message | null> => {
  const account: Account = await getAccount();

  if (!account) return null;

  const message = getCacheMessage(id) || (await getMailRequest(id, account.token));

  return message;
};
