import { Icon, Color } from "@raycast/api";

export const Colors = [Color.Red, Color.Orange, Color.Yellow, Color.Green, Color.Blue, Color.Purple];

export const Icons = {
  Announcement: "../assets/announcement.png",
  Assignment: "../assets/assignment.png",
  Code: "../assets/code.png",
  Course: "../assets/course.png",
  ExternalUrl: Icon.Link,
  File: Icon.TextDocument,
  Home: "../assets/home.png",
  HomePage: "../assets/home-page.png",
  InvalidAPIKey: "../assets/invalid-api-key.png",
  InvalidDomain: "../assets/invalid-domain.png",
  Modules: "../assets/see-modules.png",
  Page: "../assets/page.png",
  Passcode: "../assets/check-lock.png",
  Quiz: "../assets/quiz.png",
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
