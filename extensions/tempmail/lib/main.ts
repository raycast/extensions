import { LocalStorage, environment } from "@raycast/api";
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";
import fs from "fs";
import EmlParser from "eml-parser";
import axios, { AxiosResponse } from "axios";
import moment from "moment";
import { Auth, Domains, Identity, Message, Messages } from "./types";

async function handleAxiosError(e) {
  if (e.response?.status == 401) {
    await LocalStorage.removeItem("identity");
    throw Error("Token Expired");
  }
  if (e.code == "ENOTFOUND") {
    throw Error("Cannot connect to mail.tm API");
  }
  throw e;
}

export async function getDomains(): Promise<Domains> {
  try {
    const domains = await axios.get("https://api.mail.tm/domains");
    return domains.data;
  } catch (e) {
    await handleAxiosError(e);
  }
}

export async function createCustomAuth(address: string) {
  const auth: Auth = {
    address,
    password: Math.random().toString(36).slice(2, 15),
  };

  try {
    await axios.post("https://api.mail.tm/accounts", auth);
  } catch (e) {
    if (e.code == "ENOTFOUND") {
      throw Error("Cannot connect to mail.tm API");
    }
    // Account already exists
    if (e.response?.status == 422) {
      return false;
    }
    throw e;
  }

  const identity = await getIdentity();
  await deleteAuth(identity);

  await LocalStorage.setItem("authentication", JSON.stringify(auth));
}

async function createAuth() {
  let domains: Domains;
  try {
    const domainsResponse = await axios.get("https://api.mail.tm/domains");
    domains = domainsResponse.data;
  } catch (e) {
    await handleAxiosError(e);
  }

  const auth: Auth = {
    address: `${uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals], separator: "-" })}-${Math.floor(
      Math.random() * (999 - 100 + 1) + 100
    )}@${domains["hydra:member"][0]["domain"]}`,
    password: Math.random().toString(36).slice(2, 15),
  };

  try {
    await axios.post("https://api.mail.tm/accounts", auth);
  } catch (e) {
    await handleAxiosError(e);
  }

  await LocalStorage.setItem("authentication", JSON.stringify(auth));
  return auth;
}

async function deleteAuth({ id, token }) {
  try {
    await axios.delete(`https://api.mail.tm/accounts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  } catch (e) {
    await handleAxiosError(e);
  }
  await LocalStorage.removeItem("authentication");
  await LocalStorage.removeItem("identity");
}

async function getAuth(): Promise<Auth> {
  let auth: Auth;
  const rawAuth = await LocalStorage.getItem("authentication");
  if (!rawAuth) {
    auth = await createAuth();
  } else {
    auth = JSON.parse(rawAuth as string);
  }

  return auth;
}

async function getIdentity(specificAuth?: Auth): Promise<Identity> {
  let auth: Auth;
  let storedIdentity: Identity;

  const rawIdentity = await LocalStorage.getItem("identity");
  if (rawIdentity) storedIdentity = JSON.parse(rawIdentity as string);

  if (specificAuth) auth = specificAuth;
  else if (storedIdentity) {
    return storedIdentity;
  } else auth = await getAuth();

  try {
    const res = await axios.post("https://api.mail.tm/token", auth);
    await LocalStorage.setItem("identity", JSON.stringify(res.data));

    return res.data;
  } catch (e) {
    await handleAxiosError(e);
  }
}

export async function newAuth() {
  const rawAuth = await LocalStorage.getItem("authentication");
  if (rawAuth) {
    const identity = await getIdentity();
    await deleteAuth(identity);
  }
}

export async function setNewExpiry(newExpiry?: number) {
  await LocalStorage.setItem("expiry_time", newExpiry);
}

async function getGetMessages(token: string, page = 1): Promise<Messages["hydra:member"]> {
  const url = "https://api.mail.tm/messages" + (page ? `?page=${page}` : "");
  let messages: Messages;

  try {
    const messagesRes = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    messages = messagesRes.data;
  } catch (e) {
    await handleAxiosError(e);
  }

  if (
    messages["hydra:totalItems"] <= 30 ||
    messages["hydra:member"].length + (page - 1) * 30 == messages["hydra:totalItems"]
  )
    return messages["hydra:member"];

  const additionMessages = await getGetMessages(token, page + 1);
  return [...additionMessages, ...messages["hydra:member"]];
}

export async function getMailboxData() {
  const expiry_time = (await LocalStorage.getItem("expiry_time")) as number | null;

  if (expiry_time) {
    const lastActive = (await LocalStorage.getItem("last_active")) as string;

    const now = new Date().getTime() / 60000;
    const lastInteraction = new Date(lastActive).getTime() / 60000;

    if (now - lastInteraction > expiry_time) {
      await newAuth();
      await LocalStorage.setItem("last_active", new Date().toISOString());
      throw Error("Email Expired");
    }
  }

  const { token } = await getIdentity();

  const expiryTime = (await LocalStorage.getItem("expiry_time")) as number | null;
  const auth: Auth = await getAuth();
  const messages = await getGetMessages(token);

  const expiryMessage = expiryTime
    ? `Expires after ${moment.duration(expiryTime * 60000).humanize()}`
    : "Expires Never";

  await LocalStorage.setItem("last_active", new Date().toISOString());

  return { expiryMessage, currentAddress: auth.address, messages };
}

async function readEmail(id: string) {
  const { token } = await getIdentity();

  try {
    await axios.patch(
      `https://api.mail.tm/messages/${id}`,
      {
        seen: true,
      },
      {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/merge-patch+json" },
      }
    );
  } catch (e) {
    await handleAxiosError(e);
  }
}

export async function deleteEmail(id: string) {
  const { token } = await getIdentity();

  try {
    await axios.delete(`https://api.mail.tm/messages/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    await handleAxiosError(e);
  }
}

export async function getMessage(id: string): Promise<Message> {
  const { token } = await getIdentity();
  let message: Message;

  try {
    const messageRes = await axios.get(`https://api.mail.tm/messages/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    message = messageRes.data;
  } catch (e) {
    await handleAxiosError(e);
  }

  if (!message.seen) await readEmail(id);

  return message;
}

export async function createHTMLFile(emlPath: string): Promise<string> {
  const htmlPath = emlPath.replaceAll("eml", "html");
  const htmlDir = htmlPath
    .split("/")
    .splice(0, htmlPath.split("/").length - 1)
    .join("/");

  if (!fs.existsSync(htmlDir)) {
    fs.mkdirSync(htmlDir, { recursive: true });
  }

  if (fs.existsSync(htmlPath)) {
    return htmlPath;
  }

  const emlFile = fs.createReadStream(emlPath);
  const htmlString = await new EmlParser(emlFile).getEmailAsHtml();

  fs.writeFileSync(htmlPath, htmlString);

  return htmlPath;
}

export async function downloadMessage(url: string): Promise<string> {
  const { token } = await getIdentity();

  const dirPath = `${environment.supportPath}/temp/eml`;
  const filePath = `${dirPath}/${url.split("/")[2]}.eml`;

  // create folder structure of `dirPath` if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // if attachment already exists return file path
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  const file = fs.createWriteStream(filePath);
  let response: AxiosResponse;

  try {
    response = await axios.get(`https://api.mail.tm${url}`, {
      responseType: "stream",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    await handleAxiosError(e);
  }

  return new Promise((resolve, reject) => {
    response.data.pipe(file);
    let error = null;
    file.on("error", (err) => {
      error = err;
      file.close();
      reject(err);
    });
    file.on("close", () => {
      if (!error) {
        resolve(filePath);
      }
    });
  });
}

export async function downloadAttachment({
  downloadUrl,
  filename,
  id,
  transferEncoding,
}: {
  downloadUrl: string;
  filename: string;
  id: string;
  transferEncoding: string;
}): Promise<string> {
  const { token } = await getIdentity();

  const dirPath = `${environment.supportPath}/temp/attachments`;
  const filePath = `${dirPath}/${id}_${filename}`;

  // create folder structure of `dirPath` if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // if attachment already exists return file path
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  const file = fs.createWriteStream(filePath, { encoding: transferEncoding as BufferEncoding });
  let response: AxiosResponse;

  try {
    response = await axios.get(`https://api.mail.tm${downloadUrl}`, {
      responseType: "stream",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    await handleAxiosError(e);
  }

  return new Promise((resolve, reject) => {
    response.data.pipe(file);
    let error = null;
    file.on("error", (err) => {
      error = err;
      file.close();
      reject(err);
    });
    file.on("close", () => {
      if (!error) {
        resolve(filePath);
      }
    });
  });
}
