import { EventSourcePolyfill } from "event-source-polyfill";
import type * as type from "./types";
import request from "./rest-api";

const getDomains = () => request<type.DomainRes>("/domains?page=1");

const register = (address: string, password: string) =>
  request<type.RegisterRes>("/accounts", "POST", {
    address,
    password,
  });

const login = async (address: string, password: string) =>
  request<type.LoginRes>("/token", "POST", {
    address,
    password,
  });

const loginWithToken = async (token: string) => request<type.AccountResult>("/me", "GET", {}, token);

const deleteAccount = async (id: string, token: string) =>
  request<type.MessagesRes>(`/accounts?id}`, "DELETE", {}, token);
const getMessages = (token: string, page = 1) =>
  request<type.MessagesRes[]>(`/messages?page=${page}`, "GET", {}, token);

const getMessage = (messageId: string, token: string) =>
  request<type.MessageRes>("/messages/" + messageId, "GET", {}, token);

const setMessageSeen = (messageId: string, token: string, seen = true) =>
  request<type.MessageRes>("/messages/" + messageId, "PATCH", { seen }, token);

const deleteMessage = (messageId: string, token: string) =>
  request<type.DeleteRes>("/messages/" + messageId, "DELETE", {}, token);

const createOneAccount = async () => {
  const domainsRes = await getDomains();
  if (!domainsRes.status) throw new Error(domainsRes.message);

  const domain = domainsRes.data[0].domain;
  const name = await getRandomName();
  const username = `${name}@${domain}`;
  const password = makeHash(8);

  const registerRes = await register(username, password);
  if (!registerRes.status) throw new Error(registerRes.message);

  const loginRes = await login(username, password);
  if (!loginRes.status) throw new Error(loginRes.message);

  return {
    status: true,
    data: {
      username,
      password,
      token: loginRes.data.token,
      id: loginRes.data.id,
    },
  };
};

const getRandomName = async () => {
  try {
    const res = await fetch("https://frightanic.com/goodies_content/docker-names.php");
    const name = await res.text();
    return name.replace("\n", "");
  } catch (e) {
    return makeHash(5);
  }
};

const makeHash = (size: number) =>
  Array.from({ length: size }, () =>
    ((charset) => charset.charAt(Math.floor(Math.random() * charset.length)))("abcdefghijklmnopqrstuvwxyz0123456789")
  ).join("");

const subscribeToMailbox = (id: string, token: string, callback: () => void) => {
  const subscribeURL = new URL("https://mercure.mail.tm/.well-known/mercure");
  subscribeURL.searchParams.append("topic", `/accounts/${id}`);

  const eventSource = new EventSourcePolyfill(subscribeURL, {
    headers: { authorization: `Bearer ${token}` },
  });

  eventSource.addEventListener("message", callback);

  return () => eventSource.removeEventListener("message", callback);
};

export {
  createOneAccount,
  login,
  loginWithToken,
  deleteAccount,
  getMessages,
  getMessage,
  setMessageSeen,
  deleteMessage,
  subscribeToMailbox,
};
