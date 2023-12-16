import { LocalStorage, showToast, Toast, environment } from "@raycast/api";
import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from "node-html-markdown";

import fs from "fs/promises";
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
export const writeMessageToFile = async (message: string): Promise<void> => {
  // PATH
  const path = `${environment.assetsPath}/email.html`;

  // Write Message to File
  await fs.writeFile(path, message, "utf-8");
};
