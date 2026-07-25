import { Application } from "@raycast/api";

export type Tab = {
  browser: string;
  title: string;
  url: string;
  domain: string;
  windowId: string;
  tabId: string; // Webkit tab index (number); Chromium tab id (string)
  favicon?: string; // favicon URL, only provided by the Browser Extension on Windows
};

export type BrowserTab = {
  browser: Application;
  tabs: Tab[];
};

export type BrowserSetup = {
  browser: Application;
  isChecked: boolean;
};
