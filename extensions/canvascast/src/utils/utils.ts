import { Icon, Color, LocalStorage } from "@raycast/api";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { course } from "./types";

export const Colors = [Color.Red, Color.Orange, Color.Yellow, Color.Green, Color.Blue, Color.Purple];

export const Icons = {
  Announcement: Icon.Megaphone,
  // Assignment: "../assets/assignment.png",
  Assignment: Icon.Clipboard,
  Code: Icon.Code,
  Course: "../assets/books-stack.png",
  ExternalUrl: Icon.Link,
  File: Icon.Document,
  Home: Icon.House,
  HomePage: "../assets/home-page.svg",
  InvalidAPIKey: "../assets/invalid-api-key.svg",
  InvalidDomain: "../assets/invalid-domain.svg",
  Modules: Icon.BulletPoints,
  Page: "../assets/page.png",
  Passcode: Icon.LockUnlocked,
  // Quiz: "../assets/quiz.png",
  Quiz: Icon.Rocket,
  ToDo: Icon.Tray,
  Completed: Icon.Checkmark,
  Missing: Icon.Warning,
  OpenGoogleCopyLink: Icon.SaveDocument,
};

export enum Error {
  INVALID_API_KEY = 0,
  INVALID_DOMAIN = 1,
}

export const getErrorTitle = (error: Error) => {
  return error === Error.INVALID_API_KEY
    ? "Invalid API Key"
    : error === Error.INVALID_DOMAIN
      ? "Invalid Domain"
      : "Error";
};

export const getErrorMessage = (error: Error) => {
  return `Please check your ${
    error === Error.INVALID_API_KEY ? "API key" : error === Error.INVALID_DOMAIN ? "domain" : "API key or domain"
  } and try again.`;
};

export const getErrorIcon = (error: Error) => {
  return error === Error.INVALID_API_KEY
    ? Icons["InvalidAPIKey"]
    : error === Error.INVALID_DOMAIN
      ? Icons["InvalidDomain"]
      : Icon.ExclamationMark;
};

const fileTypes = [
  ".c",
  ".cs",
  ".cpp",
  ".h",
  ".hpp",
  ".css",
  ".go",
  ".html",
  ".java",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".kt",
  ".sql",
  ".php",
  ".py",
  ".ipynb",
  ".csv",
];

export const getIsCodeFile = (file: string) => {
  let isCodeFile = false;
  for (const type of fileTypes) {
    if (file.endsWith(type)) {
      isCodeFile = true;
      break;
    }
  }
  return isCodeFile;
};

export const formatModuleItemTitle = (title: string) => {
  return title
    .replace(/\s\(.*/g, "")
    .replace(/\s?:.*/g, "")
    .replace(/PM/g, "pm");
};

export const formatModuleItemPasscode = (passcode: string) => {
  return passcode.match(/Passcode: \S{9,10}/g)?.[0].substring(10);
};

export const getFormattedDate = (date: string | Date | number) => {
  return new Date(date).toString().split(" ").slice(0, 4).join(" ");
};

export const getFormattedFriendlyDate = (date: string | Date | number) => {
  return new Date(date).toLocaleDateString("en-us", { weekday: "long", month: "long", day: "numeric" });
};

export const getFormattedTime = (date: string | Date | number) => {
  return new Date(date).toLocaleTimeString([], { timeStyle: "short" });
};

export const convertHTMLToMD = (html: string) => {
  if (html) {
    html = NodeHtmlMarkdown.translate(html);
  }
  return html;
};

export const getCourseColors = async (courses: course[]) => {
  const ids = courses.map((course) => course.id);
  const colors = {};

  for (let i = 0; i < ids.length; i++) {
    colors[ids[i]] = Colors[i % Colors.length];
  }

  try {
    const cache = JSON.parse((await LocalStorage.getItem("colors")) as string);

    for (const item in cache) {
      colors[item] = cache[item];
    }
  } catch (err) {
    ("This block isn't empty anymore ESLint");
  }

  return colors;
};
