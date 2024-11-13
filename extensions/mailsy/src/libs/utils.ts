import { LocalStorage, showToast, Toast, environment, Cache } from "@raycast/api";
import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from "node-html-markdown";
import fs from "fs/promises";
import { Interval, Mail, Message } from "../types";
import { getMessage } from "./api";

// Cache
const cache = new Cache();

export const withToast =
  ({
    action,
    onSuccess,
    onFailure,
    loadingMessage,
  }: {
    action: () => Promise<void>;
    onSuccess: () => string | [string, string?];
    onFailure: (error: Error) => string | [string, string?];
    loadingMessage?: string;
  }) =>
  async () => {
    try {
      await showToast(Toast.Style.Animated, loadingMessage ?? "Loading...");
      await action();
      if (onSuccess !== undefined) {
        await showToast(Toast.Style.Success, ...toastMsg(onSuccess()));
      }
    } catch (error) {
      if (error instanceof Error) {
        if (onFailure !== undefined) {
          await showToast(Toast.Style.Failure, ...toastMsg(onFailure(error)));
        }
      }
    }
  };

export const toastMsg = (input: string | [string, string?]): [string, string?] => {
  if (Array.isArray(input)) {
    return input;
  }
  return [input];
};

// Check if user Already Logged In
export const isLoggedIn = async (): Promise<boolean> => {
  const account = await LocalStorage.getItem<string>("account");
  return account !== undefined;
};

// Remove Account
export const removeAccount = async (): Promise<void> => {
  await LocalStorage.removeItem("account");
};

// Genrate Random String
export const generateRandomString = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

// Generate Username
export const generateEmail = (domain: string): string => {
  return `${generateRandomString()}@${domain}`;
};

// Generate Password
export const generatePassword = (): string => {
  return generateRandomString();
};

// Convert HTML to Markdown
export const htmlToMarkdown = (html: string): string => {
  const options: NodeHtmlMarkdownOptions = {
    preferNativeParser: false,
    codeFence: "```",
    bulletMarker: "*",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    strongDelimiter: "**",
    strikeDelimiter: "~~",
    maxConsecutiveNewlines: 2,
    keepDataImages: true,
    useLinkReferenceDefinitions: true,
    useInlineLinks: true,
    lineStartEscape: [/^>/, "\\>"],
    globalEscape: [/^>/, "\\>"],
    textReplace: [
      [/\s+/g, " "],
      [/\s+$/, ""],
      [/^\s+/, ""],
      [/ {2,}/g, " "],
    ],
    ignore: ["script", "style", "head", "title", "meta", "link", "object", "iframe", "svg", "math", "pre"],
    blockElements: ["div", "p", "form", "table", "ul", "ol", "dl", "blockquote", "address", "math", "pre"],
  };

  return NodeHtmlMarkdown.translate(html, options);
};

// Write Message to File
export const writeMessageToFile = async (message: Message): Promise<void> => {
  if (!message) return;

  const content = message.html ? message.html[0] : "No Content";

  const path = `${environment.assetsPath}/${message.id}.html`;

  await fs.writeFile(path, content, "utf-8");
};

export const timeAgo = (date: string): string => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

  const intervals: Interval[] = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ];

  const interval = intervals.find((i) => seconds / i.seconds >= 1);

  if (interval) {
    const value = Math.floor(seconds / interval.seconds);
    return `${value} ${interval.label}${value > 1 ? "s" : ""} ago`;
  }

  return "just now";
};

export const handleAction = (
  action: () => Promise<void>,
  onSuccess: () => void,
  loadingMessage: string,
  successMessage: string,
  failureMessage: string,
) => {
  withToast({
    action,
    onSuccess: () => {
      onSuccess();
      return successMessage;
    },
    onFailure: () => failureMessage,
    loadingMessage,
  })();
};

// This function either gets the message from the cache or fetches it from the server
export const getMessageOrUseCache = async (mail: Mail): Promise<Message | null> => {
  const cachedMessage = cache.get(mail.id);
  if (cachedMessage) return JSON.parse(cachedMessage);

  const message = await getMessage(mail.id);

  if (!message) return null;

  writeMessageToFile(message);
  cache.set(mail.id, JSON.stringify(message));
  return message;
};

// This function checks if a message is not null
export const isNotNull = (message: Message | null): message is Message => {
  return message !== null;
};

export const getCacheMessage = (id: string): Message | null => {
  const cachedMessage = cache.get(id);
  if (cachedMessage) return JSON.parse(cachedMessage);
  return null;
};

export const deleteMessageCache = async (id: string): Promise<void> => {
  cache.remove(id);

  // Delete File
  await fs.unlink(`${environment.assetsPath}/${id}.html`);
};
