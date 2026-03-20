import { LocalStorage, showToast, Toast } from "@raycast/api";
import { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } from "node-html-markdown";
import { Interval } from "../types";

const ACCOUNT_STORAGE_KEY = "account";

const toToastMessage = (input: string | [string, string?]): [string, string?] => {
  return Array.isArray(input) ? input : [input];
};

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return new Error(error);
  }

  return new Error("Something went wrong");
};

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
      await showToast(Toast.Style.Success, ...toToastMessage(onSuccess()));
    } catch (error) {
      await showToast(Toast.Style.Failure, ...toToastMessage(onFailure(toError(error))));
    }
  };

export const isLoggedIn = async (): Promise<boolean> => {
  const account = await LocalStorage.getItem<string>(ACCOUNT_STORAGE_KEY);
  return account !== undefined;
};

export const removeAccount = async (): Promise<void> => {
  await LocalStorage.removeItem(ACCOUNT_STORAGE_KEY);
};

export const htmlToMarkdown = (html: string): string => {
  const options: NodeHtmlMarkdownOptions = {
    preferNativeParser: false,
    indent: "  ",
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

export const timeAgo = (date: string): string => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const intervals: Interval[] = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ];

  const interval = intervals.find((item) => seconds / item.seconds >= 1);
  if (!interval) {
    return "just now";
  }

  const value = Math.floor(seconds / interval.seconds);
  return `${value} ${interval.label}${value > 1 ? "s" : ""} ago`;
};

export const handleAction = (
  action: () => Promise<void>,
  onSuccess: () => void,
  loadingMessage: string,
  successMessage: string,
  failureMessage: string,
): void => {
  void withToast({
    action,
    onSuccess: () => {
      onSuccess();
      return successMessage;
    },
    onFailure: () => failureMessage,
    loadingMessage,
  })();
};
