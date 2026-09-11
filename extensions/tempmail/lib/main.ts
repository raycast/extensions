import { LocalStorage, environment } from "@raycast/api";
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";
import fs from "fs";
import axios, { AxiosResponse } from "axios";
import moment from "moment";
import { Auth, Domains, Identity, Message, Messages } from "./types";

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"]);
const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/bmp": ".bmp",
};

function extFromUrl(url: string): string {
  const bare = url.split("?")[0];
  const candidate = bare.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTS.has(candidate) ? `.${candidate}` : "";
}

export interface PreprocessResult {
  html: string;
  localToOriginal: Map<string, string>; // encoded file:// URI → original https URL
}

export async function preprocessHtmlImages(html: string): Promise<PreprocessResult> {
  const dir = `${environment.supportPath}/temp/images`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const srcPattern = /src=(["'])(https?:\/\/[^"']+)\1/gi;
  const uniqueUrls = [...new Set([...html.matchAll(srcPattern)].map((m) => m[2]))];

  if (uniqueUrls.length === 0) return { html, localToOriginal: new Map() };

  const urlToPath = new Map<string, string>(); // original URL → local file path

  await Promise.allSettled(
    uniqueUrls.map(async (url) => {
      const base = Buffer.from(url).toString("base64").replace(/[/+=]/g, "_").slice(0, 80);
      try {
        let ext = extFromUrl(url);
        let cachedPath: string | undefined;
        if (ext) {
          const candidate = `${dir}/${base}${ext}`;
          if (fs.existsSync(candidate)) cachedPath = candidate;
        } else {
          for (const knownExt of Object.values(CONTENT_TYPE_EXT)) {
            const candidate = `${dir}/${base}${knownExt}`;
            if (fs.existsSync(candidate)) {
              cachedPath = candidate;
              break;
            }
          }
        }

        if (cachedPath) {
          urlToPath.set(url, cachedPath);
        } else {
          const response = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 10000,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
            },
          });
          if (!ext) {
            const ct = (response.headers["content-type"] as string | undefined)?.split(";")[0].trim() ?? "";
            ext = CONTENT_TYPE_EXT[ct] ?? ".jpg";
          }
          const filePath = `${dir}/${base}${ext}`;
          fs.writeFileSync(filePath, Buffer.from(response.data));
          urlToPath.set(url, filePath);
        }
      } catch {
        // download failed — original URL stays in the HTML as-is
      }
    })
  );

  const localToOriginal = new Map<string, string>();

  const processedHtml = html.replace(srcPattern, (_, quote, url) => {
    const localPath = urlToPath.get(url);
    if (!localPath) return `src=${quote}${url}${quote}`;
    const fileUri = encodeURI(`file://${localPath}`);
    localToOriginal.set(fileUri, url);
    return `src=${quote}${fileUri}${quote}`;
  });

  return { html: processedHtml, localToOriginal };
}

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

async function withTokenRetry<T>(fn: (token: string) => Promise<T>): Promise<T> {
  try {
    const { token } = await getIdentity();
    return await fn(token);
  } catch (e) {
    if (e.message !== "Token Expired") {
      throw e;
    }
    const { token } = await getIdentity();
    return await fn(token);
  }
}

export async function newAuth() {
  const rawAuth = await LocalStorage.getItem("authentication");
  if (rawAuth) {
    const identity = await getIdentity();
    await deleteAuth(identity);
  }
}

export async function setNewExpiry(newExpiry?: number | null) {
  if (newExpiry == null) {
    await LocalStorage.removeItem("expiry_time");
  } else {
    await LocalStorage.setItem("expiry_time", newExpiry);
  }
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
  return [...messages["hydra:member"], ...additionMessages];
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

  const expiryTime = (await LocalStorage.getItem("expiry_time")) as number | null;
  const auth: Auth = await getAuth();

  const messages = await withTokenRetry((token) => getGetMessages(token));

  const expiryMessage = expiryTime
    ? `Expires after ${moment.duration(expiryTime * 60000).humanize()}`
    : "Expires Never";

  await LocalStorage.setItem("last_active", new Date().toISOString());

  return { expiryMessage, currentAddress: auth.address, messages };
}

async function readEmail(id: string) {
  await withTokenRetry(async (token) => {
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
  });
}

export async function deleteEmail(id: string) {
  await withTokenRetry(async (token) => {
    try {
      await axios.delete(`https://api.mail.tm/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      await handleAxiosError(e);
    }
  });
}

export async function getMessage(id: string): Promise<Message> {
  const message = await withTokenRetry(async (token) => {
    try {
      const messageRes = await axios.get(`https://api.mail.tm/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return messageRes.data;
    } catch (e) {
      await handleAxiosError(e);
    }
  });

  if (!message.seen) await readEmail(id);

  return message;
}

export async function createHTMLFile(id: string, html: string[]): Promise<string> {
  const htmlDir = `${environment.supportPath}/temp/html`;
  const htmlPath = `${htmlDir}/${id}.html`;

  if (!fs.existsSync(htmlDir)) {
    fs.mkdirSync(htmlDir, { recursive: true });
  }

  if (fs.existsSync(htmlPath)) {
    return htmlPath;
  }

  fs.writeFileSync(htmlPath, html.join(""));
  return htmlPath;
}

export async function downloadMessage(url: string): Promise<string> {
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

  return withTokenRetry(async (token) => {
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

    return new Promise<string>((resolve, reject) => {
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

  return withTokenRetry(async (token) => {
    const file = fs.createWriteStream(filePath);
    let response: AxiosResponse;

    try {
      response = await axios.get(`https://api.mail.tm${downloadUrl}`, {
        responseType: "stream",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      await handleAxiosError(e);
    }

    return new Promise<string>((resolve, reject) => {
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
  });
}
